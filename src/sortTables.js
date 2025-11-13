/**
 * sortTables.js
 * Enables column sorting for all tables with data-sortable="true".
 */

(() => {
  const tables = document.querySelectorAll('table[data-sortable="true"]');
  for (const table of tables) {
    table.dataset.sortDir = '';
    const headers = table.querySelectorAll('th');

    headers.forEach((th, index) => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sortTable(table, index));
    });
  }
})();

/**
 * Sorts a table by the specified column index, toggling asc/desc.
 */
const sortTable = (table, columnIndex) => {
  const tbody = table.tBodies[0];
  if (!tbody) return;

  const rows = [...tbody.rows];
  const isAsc = table.dataset.sortDir !== 'asc';
  const dir = isAsc ? 'asc' : 'desc';

  const sorted = rows.sort((a, b) => {
    const aText = a.cells[columnIndex]?.textContent.trim().toLowerCase() ?? '';
    const bText = b.cells[columnIndex]?.textContent.trim().toLowerCase() ?? '';

    const aNum = parseFloat(aText);
    const bNum = parseFloat(bText);
    const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);

    if (bothNumeric) return isAsc ? aNum - bNum : bNum - aNum;
    return isAsc ? aText.localeCompare(bText) : bText.localeCompare(aText);
  });

  tbody.replaceChildren(...sorted);
  table.dataset.sortDir = dir;
};
