import { seedUserData } from "@/data/seedUser";

test("seed data loads", () => {
  expect(seedUserData.user.id).toBeDefined();
});
