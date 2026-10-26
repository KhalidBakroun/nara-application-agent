import { describe, expect, it } from "vitest";
import { nextInterviewTurn } from "@/lib/agent/interview";
import type { ModelClient } from "@/lib/meta/modelClient";
import type { StudentProfile } from "@/lib/domain/types";

const replyWith = (text: string): ModelClient => ({ respond: async () => ({ text, toolCalls: [] }) });

const empty: StudentProfile = { englishTest: { type: "none" }, targetCountries: [], sources: {} };

describe("nextInterviewTurn", () => {
  const history = [
    { role: "agent" as const, text: "ما معدلك في التوجيهي وما فرعك؟" },
    { role: "student" as const, text: "معدلي ٨٥ في الفرع العلمي" },
  ];

  it("fills the profile from the answer and cites the student's own words", async () => {
    const model = replyWith(
      JSON.stringify({ update: { tawjihiAverage: "٨٥", stream: "scientific" }, nextQuestionAr: "ما التخصص الذي تريده؟" }),
    );

    const turn = await nextInterviewTurn(model, history, empty);

    expect(turn.profile.tawjihiAverage).toBe(85);
    expect(turn.profile.stream).toBe("scientific");
    expect(turn.profile.sources.tawjihiAverage).toEqual({ kind: "interview", turn: 1, quote: "معدلي ٨٥ في الفرع العلمي" });
    expect(turn.nextQuestionAr).toBe("ما التخصص الذي تريده؟");
    expect(turn.done).toBe(false);
  });

  it("is done once name, grade, stream, field, English test and a country are known", async () => {
    const almost: StudentProfile = {
      ...empty,
      fullName: "لينا أحمد الخطيب",
      tawjihiAverage: 92.1,
      stream: "scientific",
      fieldOfStudy: "computer_science",
      targetCountries: ["UK"],
    };
    const model = replyWith(JSON.stringify({ update: { englishTestType: "IELTS", englishScore: 6.5 }, nextQuestionAr: "شكراً!" }));

    const turn = await nextInterviewTurn(model, [...history, { role: "student", text: "عندي آيلتس ٦٫٥" }], almost);

    expect(turn.profile.englishTest).toEqual({ type: "IELTS", score: 6.5 });
    expect(turn.done).toBe(true);
  });

  it("keeps the profile and asks again when the model reply is not valid JSON", async () => {
    const turn = await nextInterviewTurn(replyWith("{not json"), history, empty);

    expect(turn.profile).toEqual(empty);
    expect(turn.nextQuestionAr).toBe("عذراً، هل يمكنك إعادة ذلك؟");
    expect(turn.done).toBe(false);
  });
});
