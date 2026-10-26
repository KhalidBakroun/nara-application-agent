// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewBoard } from "@/components/ReviewBoard";
import type { ApplicationPack } from "@/lib/domain/types";

const pack: ApplicationPack = {
  programmeId: "ashbury-cs",
  fields: [
    {
      key: "fullName",
      label: "Full name",
      labelAr: "الاسم الكامل",
      value: "لينا أحمد الخطيب",
      source: { kind: "document", documentId: "doc-1", fieldKey: "full_name", box: [0, 0, 10, 10] },
      confidence: "high",
    },
    {
      key: "tawjihiAverage",
      label: "Tawjihi average",
      labelAr: "معدل التوجيهي",
      value: "92.1",
      source: { kind: "interview", turn: 2, quote: "معدلي ٩٢٫١" },
      confidence: "medium",
    },
    { key: "programme", label: "Programme applied for", labelAr: "البرنامج المطلوب", value: "BSc Computer Science", confidence: "medium" },
  ],
  missing: ["passport"],
  shortlist: [],
};

afterEach(cleanup);

describe("ReviewBoard", () => {
  it("renders right-to-left", () => {
    const { container } = render(<ReviewBoard pack={pack} documents={[]} />);
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
  });

  it("marks a field without a source as needing the counsellor", () => {
    render(<ReviewBoard pack={pack} documents={[]} />);
    expect(screen.getAllByText("يحتاج مراجعة المرشد")).toHaveLength(1);
  });

  it("shows the interview quote as the source of an interview field", () => {
    render(<ReviewBoard pack={pack} documents={[]} />);
    expect(screen.getByText(/معدلي ٩٢٫١/)).toBeTruthy();
  });

  it("enables 'Approve pack' only after every field is approved", () => {
    render(<ReviewBoard pack={pack} documents={[]} />);
    const approvePack = screen.getByRole("button", { name: "اعتماد الملف" }) as HTMLButtonElement;
    expect(approvePack.disabled).toBe(true);

    for (const button of screen.getAllByRole("button", { name: "اعتماد" })) fireEvent.click(button);

    expect(approvePack.disabled).toBe(false);
  });
});
