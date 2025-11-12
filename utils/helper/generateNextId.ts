export const generateNextId = (allIds: string[], prefix: string, num: number) => {
  let maxNumber = 0;
  allIds.forEach((ids) => {
    const match = ids.slice(-4).match(/\d{1,4}$/); // Tìm số ở cuối ID
    if (match) {
      const number = parseInt(match[0], 10);
      if (!isNaN(number) && number > maxNumber) {
        maxNumber = number;
      }
    }
  });
  const newNumber = maxNumber + 1;
  const formattedNumber = String(newNumber).padStart(num, "0");
  return `${prefix}${formattedNumber}`;
};
