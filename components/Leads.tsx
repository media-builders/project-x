// components/LeadsTable.tsx

export default function LeadsTable() {
  return (
    <table class="contact-table">
    <thead>
      <tr>
        <th class="header-cell">First Name</th>
        <th class="header-cell">Last Name</th>
        <th class="header-cell">Email</th>
        <th class="header-cell">Phone Number</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="data-cell">Jane</td>
        <td class="data-cell">Doe</td>
        <td class="data-cell">jane.doe@example.com</td>
        <td class="data-cell">(555) 123-4567</td>
      </tr>
      <tr>
        <td class="data-cell">John</td>
        <td class="data-cell">Smith</td>
        <td class="data-cell">john.smith@example.com</td>
        <td class="data-cell">(555) 987-6543</td>
      </tr>
    </tbody>
  </table>
  );
}
