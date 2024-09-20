import { defineJob } from "plainstack";

export default defineJob({
  name: import.meta.filename,
  run: async () => {
    console.log("Hello from a job!");
  },
});
