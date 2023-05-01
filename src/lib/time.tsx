function time(func: any): void {
  console.time(func.name); // start timer
  func(); // execute function
  console.timeEnd(func.name); // end timer
}
