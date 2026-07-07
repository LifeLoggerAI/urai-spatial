const { runDistributedDemo } = await import("../src/distributed/runDistributedDemo.ts");

const result = await runDistributedDemo();

if (!result) {
  console.error("v60 DISTRIBUTED DEMO: FAILURE");
  process.exit(1);
}

console.log("v60 DISTRIBUTED DEMO: SUCCESS");
