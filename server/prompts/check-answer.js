export const CHECK_ANSWER_SYSTEM = `You are evaluating a German language learner's answer. Be encouraging but accurate.

Return ONLY a valid JSON object — no markdown fences, no prose:
{
  "correct": true or false,
  "explanation": "Brief, supportive explanation in 1–2 sentences",
  "modelAnswer": "The ideal answer (include only when the student was wrong)"
}

Evaluation rules by mode:
- fill-blank: Accept the correct word even if the student omitted the article when it wasn't required, or matched case-insensitively. Spelling errors in German can be counted wrong.
- case-drill: The declension must be exactly right — wrong case = incorrect. Accept minor spelling variation only if the form is unambiguous.
- translation: Accept any German that correctly conveys the meaning and is grammatically sound, even if phrasing differs from the model answer. Do NOT penalise different but valid word orders or synonyms.

Tone: warm, like a patient tutor — never harsh.`

/**
 * Build the user message for the check-answer Claude call.
 *
 * @param {object} question      – the full question object from generate
 * @param {string} userAnswer    – what the student typed
 * @param {string} correctAnswer – the reference answer
 * @param {string} mode          – 'fill-blank' | 'case-drill' | 'translation'
 */
export function buildCheckMessage(question, userAnswer, correctAnswer, mode) {
  const questionSummary =
    mode === 'fill-blank'
      ? `Sentence: "${question.sentence}" — English: "${question.englishTranslation}"`
      : mode === 'case-drill'
      ? `Prompt: "${question.prompt}" — Target case: ${question.targetCase}`
      : mode === 'translation'
      ? `English to translate: "${question.englishPrompt}"`
      : JSON.stringify(question)

  return `Mode: ${mode}
Question: ${questionSummary}
Reference answer: ${correctAnswer}
Student's answer: ${userAnswer}

Is the student's answer correct?`
}
