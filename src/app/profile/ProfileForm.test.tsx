import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import ProfileForm from "./ProfileForm";
import type { Profile } from "@/lib/user-types";

const EMPTY: Profile = { role: null, gradeInterest: null, school: null, district: null };

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProfileForm", () => {
  it("renders initial values from the given profile", () => {
    render(
      <ProfileForm
        initialProfile={{ role: "teacher", gradeInterest: [11, 12], school: "X High", district: "SD1" }}
      />
    );
    expect(screen.getByLabelText("Role")).toHaveValue("teacher");
    expect(screen.getByRole("checkbox", { name: "Grade 11" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Grade 12" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Grade 10" })).not.toBeChecked();
    expect(screen.getByPlaceholderText("e.g. Burnaby North Secondary")).toHaveValue("X High");
    expect(screen.getByPlaceholderText("e.g. SD 41 Burnaby")).toHaveValue("SD1");
  });

  it("saves edited fields and shows a success confirmation", async () => {
    const fetchMock = vi.fn(() => okJson({ role: "student", gradeInterest: [10], school: "New School", district: null }));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProfileForm initialProfile={EMPTY} />);
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "student" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Grade 10" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Burnaby North Secondary"), { target: { value: "New School" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Saved");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/profile",
      expect.objectContaining({ method: "PATCH" })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ role: "student", gradeInterest: [10], school: "New School", district: null });
  });

  it("shows an inline error when the save fails", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: "role must be one of..." }) } as Response)
    ) as unknown as typeof fetch;

    render(<ProfileForm initialProfile={EMPTY} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("role must be one of...")).toBeInTheDocument();
  });

  it("disables inputs while saving", async () => {
    let resolveFetch: (v: Response) => void = () => {};
    global.fetch = vi.fn(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; })
    ) as unknown as typeof fetch;

    render(<ProfileForm initialProfile={EMPTY} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByLabelText("Role")).toBeDisabled();

    resolveFetch({ ok: true, status: 200, json: () => Promise.resolve(EMPTY) } as Response);
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled());
  });

  it("clears fields to null when emptied", async () => {
    const fetchMock = vi.fn(() => okJson(EMPTY));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ProfileForm initialProfile={{ role: "teacher", gradeInterest: [10], school: "X", district: "Y" }} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Burnaby North Secondary"), { target: { value: "   " } });
    fireEvent.change(screen.getByPlaceholderText("e.g. SD 41 Burnaby"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Saved");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.school).toBeNull();
    expect(body.district).toBeNull();
  });
});
