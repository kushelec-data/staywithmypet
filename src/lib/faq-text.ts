/** Strip leading FAQ list numbers (e.g. "2. Question?") from imported or stored titles. */
export function stripFaqQuestionPrefix(text: string): string {
  return text.replace(/^\d+\.\s*/, "").trim();
}
