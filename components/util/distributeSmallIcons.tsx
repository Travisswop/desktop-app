const distributeSmallIcons = (icons: any[]) => {
  const length = icons.length;
  const rows: any[][] = [];

  // Case 1: 12 or fewer → single or split rows (your choice)
  if (length <= 6) {
    return [icons];
  }

  if (length <= 12) {
    // const mid = Math.ceil(length / 2);
    // return [icons.slice(0, mid), icons.slice(mid)];

    const firstRow = Math.ceil(length / 2) - 1;
    // const secondRow = Math.ceil(length / 2) + 1;
    return [icons.slice(0, firstRow), icons.slice(firstRow)];
  }

  // Case 2: More than 12 → always 6 per row
  for (let i = 0; i < length; i += 6) {
    rows.push(icons.slice(i, i + 6));
  }

  return rows;
};

export default distributeSmallIcons;
