// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewBoard } from "@/components/ReviewBoard";
import type { ApplicationPack } from "@/lib/domain/types";
import { LangProvider, LangToggle, STRINGS, useLang } from "@/lib/i18n";

const pack: ApplicationPack = {
  programmeId: "ashbury-cs",
  fields: [
    { key: "fullName", label: "Full name", labelAr: "الاسم الكامل", value: "لينا أحمد الخطيب", source: { kind: "interview", turn: 1, quote: "اسمي لينا" }, confidence: "high" },
    { key: "programme", label: "Programme applied for", labelAr: "البرنامج المطلوب", value: "BSc Computer Science", confidence: "medium" },
  ],
  missing: ["passport"],
  shortlist: [],
};

afterEach(cleanup);

function Title() {
  const { t } = useLang();
  return <h1>{t("appTitle")}</h1>;
}

describe("English toggle", () => {
  it("has the same keys in Arabic and English", () => {
    expect(Object.keys(STRINGS.en).sort()).toEqual(Object.keys(STRINGS.ar).sort());
  });

  it("shows the counsellor review in English, left to right", () => {
    const { container } = render(
      <LangProvider initial="en">
        <ReviewBoard pack={pack} documents={[]} />
      </LangProvider>,
    );
    expect(container.querySelector('[dir="ltr"]')).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(2);
    expect(screen.getByText("Needs counsellor review")).toBeTruthy();
    expect(screen.getByText("Passport")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approve application" })).toBeTruthy();
  });

  it("switches language and page direction from the toggle", () => {
    render(
      <LangProvider>
        <LangToggle />
        <Title />
      </LangProvider>,
    );
    expect(screen.getByRole("heading").textContent).toBe("وكيل نارا");

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("heading").textContent).toBe("Nara Agent");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
  });
});
