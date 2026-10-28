import { describe, expect, it } from "vitest";
import { parseScore, questionSchema, toQuestionInput } from "./exams";

describe("questionSchema", () => {
  it("accepts an MCQ and stores the correct option index", () => {
    const parsed = questionSchema.parse({
      type: "mcq",
      text: "2 + 2 = ?",
      options: ["3", "4"],
      correct: "1",
      points: "2",
    });
    expect(toQuestionInput(parsed)).toEqual({
      type: "mcq",
      text: "2 + 2 = ?",
      options: ["3", "4"],
      correctAnswer: 1,
      points: 2,
    });
  });

  it("rejects an MCQ with an empty option or no correct answer", () => {
    expect(
      questionSchema.safeParse({ type: "mcq", text: "Q", options: ["a", ""], correct: "0", points: 1 })
        .success,
    ).toBe(false);
    expect(
      questionSchema.safeParse({ type: "mcq", text: "Q", options: ["a", "b"], correct: "", points: 1 })
        .success,
    ).toBe(false);
  });

  it("maps true/false and short answers", () => {
    const tf = questionSchema.parse({ type: "true_false", text: "Q", options: [], correct: "false", points: 1 });
    expect(toQuestionInput(tf).correctAnswer).toBe(false);
    const short = questionSchema.parse({ type: "short", text: "Q", options: ["x"], correct: "", points: 1 });
    expect(toQuestionInput(short)).toMatchObject({ options: [], correctAnswer: null });
  });
});

describe("parseScore", () => {
  it("reads empty, valid and out-of-range scores", () => {
    expect(parseScore("", 20)).toBeNull();
    expect(parseScore(" 17.5 ", 20)).toBe(17.5);
    expect(parseScore("21", 20)).toBe("invalid");
    expect(parseScore("-1", 20)).toBe("invalid");
    expect(parseScore("abc", 20)).toBe("invalid");
  });
});
