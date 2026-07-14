import { runDistributedDemo } from "../src/distributed/runDistributedDemo";

const ok = runDistributedDemo();

if (!ok) {
  process.exitCode = 1;
}
