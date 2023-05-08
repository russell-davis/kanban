export function getHoursMinutes(totalTimeInHoursAndMinutes: Duration) {
  // if all are zero, return --:--
  if (
    totalTimeInHoursAndMinutes.seconds === 0 &&
    totalTimeInHoursAndMinutes.minutes === 0 &&
    totalTimeInHoursAndMinutes.hours === 0
  ) {
    return "--:--";
  }

  // if less than 1 minute, return 00:01
  if (
    totalTimeInHoursAndMinutes.seconds &&
    totalTimeInHoursAndMinutes.seconds < 60 &&
    totalTimeInHoursAndMinutes.minutes === 0 &&
    totalTimeInHoursAndMinutes.hours === 0
  ) {
    return "00:01";
  }

  return `${
    !!totalTimeInHoursAndMinutes.hours && totalTimeInHoursAndMinutes.hours > 9
      ? totalTimeInHoursAndMinutes.hours
      : `0${totalTimeInHoursAndMinutes.hours}`
  }:${
    !!totalTimeInHoursAndMinutes.minutes && totalTimeInHoursAndMinutes.minutes > 9
      ? totalTimeInHoursAndMinutes.minutes
      : `0${totalTimeInHoursAndMinutes.minutes}`
  }`;
}
