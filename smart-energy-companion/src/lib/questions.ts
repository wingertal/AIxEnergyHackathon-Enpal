// Most-asked questions across users, surfaced on the home screen and ranked by
// how many people asked them. (Counts are illustrative aggregate data.)

export interface PopularQuestion {
  q: string;
  asked_by: number;
}

export const POPULAR_QUESTIONS: PopularQuestion[] = [
  { q: "Why was my bill high this month?", asked_by: 1284 },
  { q: "Should I charge the car now?", asked_by: 973 },
  { q: "Is my contract still a good deal?", asked_by: 661 },
  { q: "How much did my solar save me?", asked_by: 540 },
  { q: "When is power cheapest today?", asked_by: 498 },
];
