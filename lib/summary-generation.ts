/**
 * Summary Generation Utilities
 *
 * Uses Claude API to generate structured summaries from conversation transcripts
 * for travel booking progress tracking and context injection.
 */

import { getSupabase } from "./database";
import type { CallMessage, CallSummary } from "./db-helpers";

// ============================================
// TYPES
// ============================================

export interface BookingProgress {
  bookingProgress: "not_started" | "partial" | "complete";
  cities: Array<{
    city: string;
    dates?: string;
    checkIn?: string;
    checkOut?: string;
    travelers?: number;
    rooms?: number;
    budget?: number;
    budgetRange?: string;
    status: "complete" | "partial" | "interrupted";
  }>;
  travelers: number;
  specialRequests: string[];
  userName?: string;
  userPreferences?: {
    budget?: string;
    budgetRange?: [number, number];
    preferredRegions?: string[];
    specialNeeds?: string[];
  };
}

export interface UserPreferences {
  userName?: string;
  budget?: string;
  budgetRange?: [number, number];
  typicalTravelers?: number;
  preferredRegions?: string[];
  specialNeeds?: string[];
  preferences?: string[];
}

// ============================================
// CLAUDE API INTEGRATION
// ============================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function callClaude(prompt: string, systemPrompt?: string, maxTokens: number = 1000) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ============================================
// SUMMARY GENERATION FUNCTIONS
// ============================================

/**
 * Generate booking progress summary from conversation
 */
export async function generateBookingSummary(
  messages: CallMessage[]
): Promise<BookingProgress> {
  // Format conversation for Claude
  const conversation = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join("\n");

  const prompt = `
You are analyzing a travel planning conversation. Extract structured data from this conversation:

CONVERSATION:
${conversation}

Extract and return ONLY valid JSON with this exact structure:
{
  "bookingProgress": "not_started" | "partial" | "complete",
  "cities": [
    {
      "city": "city name",
      "dates": "date range mentioned",
      "checkIn": "check-in date if specified",
      "checkOut": "check-out date if specified",
      "travelers": number of travelers,
      "rooms": number of rooms,
      "budget": budget per night as number,
      "budgetRange": "budget range mentioned",
      "status": "complete" | "partial" | "interrupted"
    }
  ],
  "travelers": total number of travelers,
  "specialRequests": ["array of special requests mentioned"],
  "userName": "user's first name if mentioned",
  "userPreferences": {
    "budget": "budget mentioned",
    "preferredRegions": ["array of preferred regions if mentioned"],
    "specialNeeds": ["array of special needs if mentioned"]
  }
}

Rules:
- If cities discussed, include in cities array
- budget should be a number (extract digits only)
- If user didn't mention their name, omit userName field
- If no special requests, return empty array
- If conversation just started, set bookingProgress to "not_started"
- If some cities fully specified, others partial, mark accordingly
- Return ONLY the JSON object, no explanation text
`;

  try {
    const response = await callClaude(prompt, undefined, 1500);

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const summary = JSON.parse(jsonMatch[0]);
    return summary as BookingProgress;
  } catch (error) {
    console.error("Error generating booking summary:", error);

    // Return empty summary on error
    return {
      bookingProgress: "not_started",
      cities: [],
      travelers: 0,
      specialRequests: [],
    };
  }
}

/**
 * Generate user preferences summary
 */
export async function generateUserPreferences(
  messages: CallMessage[]
): Promise<UserPreferences> {
  const conversation = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join("\n");

  const prompt = `
You are analyzing a travel planning conversation to extract user preferences:

CONVERSATION:
${conversation}

Extract and return ONLY valid JSON with this exact structure:
{
  "userName": "user's first name if mentioned",
  "budget": "budget mentioned if any",
  "budgetRange": [min, max] as numbers if specific range mentioned,
  "typicalTravelers": number if mentioned,
  "preferredRegions": ["array of preferred travel regions"],
  "specialNeeds": ["array of special needs or accessibility requirements"],
  "preferences": ["array of general preferences mentioned"]
}

Rules:
- Only include fields that were explicitly mentioned
- If nothing mentioned, return empty object: {}
- Return ONLY the JSON object, no explanation text
`;

  try {
    const response = await callClaude(prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const preferences = JSON.parse(jsonMatch[0]);
    return preferences as UserPreferences;
  } catch (error) {
    console.error("Error generating user preferences:", error);
    return {};
  }
}

/**
 * Generate natural language summary of conversation
 */
export async function generateConversationSummary(
  messages: CallMessage[]
): Promise<string> {
  const conversation = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join("\n");

  const prompt = `
Summarize this travel planning conversation in 2-3 sentences:

${conversation}

Focus on:
- Where they want to travel (destinations)
- When (dates)
- How many people
- Budget if mentioned
- Any special requests or occasions

Keep it factual and concise. No preamble, just the summary.
`;

  try {
    const summary = await callClaude(prompt, "You are a travel planning assistant.", 200);
    return summary.trim();
  } catch (error) {
    console.error("Error generating conversation summary:", error);
    return "Conversation summary unavailable.";
  }
}

// ============================================
// MAIN SUMMARY FUNCTION
// ============================================

/**
 * Main function to generate all summaries for a call
 * Stores results in database
 */
export async function generateAndStoreSummaries(
  callId: string,
  userId: string,
  messages: CallMessage[]
): Promise<void> {
  if (messages.length === 0) {
    console.log("No messages to summarize for call:", callId);
    return;
  }

  try {
    // Generate all summaries in parallel
    const [bookingProgress, userPreferences, conversationSummary] = await Promise.all([
      generateBookingSummary(messages),
      generateUserPreferences(messages),
      generateConversationSummary(messages),
    ]);

    // Store booking progress summary
    await storeSummaryInDb(callId, userId, "booking_progress", {
      ...bookingProgress,
      conversationSummary,
    });

    // Store user preferences if any extracted
    if (Object.keys(userPreferences).length > 0) {
      await storeSummaryInDb(callId, userId, "user_preferences", userPreferences);

      // Also update user profile with extracted data
      if (userPreferences.userName || Object.keys(userPreferences).length > 0) {
        await updateUserFromSummary(userId, userPreferences);
      }
    }

    // Store conversation summary
    await storeSummaryInDb(callId, userId, "conversation_summary", {
      summary: conversationSummary,
      messageCount: messages.length,
    });

    console.log(`✅ Summaries generated and stored for call ${callId}`);
  } catch (error) {
    console.error("❌ Error generating summaries for call:", callId, error);
    // Don't throw - summary generation failure shouldn't break the flow
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function storeSummaryInDb(
  callId: string,
  userId: string,
  summaryType: CallSummary["summary_type"],
  summaryData: Record<string, any>
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("call_summaries")
    .insert({
      call_id: callId,
      user_id: userId,
      summary_type: summaryType,
      summary_data: summaryData,
    });

  if (error) {
    console.error(`Error storing ${summaryType} summary:`, error);
    throw error;
  }
}

async function updateUserFromSummary(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  const supabase = getSupabase();

  const updates: Partial<{ name: string; preferences: Record<string, any> }> = {};

  if (preferences.userName) {
    updates.name = preferences.userName;
  }

  if (Object.keys(preferences).length > 0) {
    updates.preferences = preferences;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user from summary:", error);
  }
}

// ============================================
// CONVERSATION COMPRESSION
// ============================================

/**
 * Compress long conversations for context injection
 * Keeps first 3, last 5 messages, summarizes the middle
 */
export function compressConversation(
  messages: CallMessage[],
  threshold: number = 30
): CallMessage[] {
  if (messages.length <= threshold) {
    return messages;
  }

  const first = messages.slice(0, 3);
  const last = messages.slice(-5);
  const middle = messages.slice(3, -5);

  // Create synthetic summary message
  const summary: CallMessage = {
    role: "user",
    text: `[Earlier in conversation: Discussed ${middle.length} topics including travel plans, destinations, and preferences]`,
    ordinal: -1, // Indicates this is synthetic
  };

  return [...first, summary, ...last];
}
