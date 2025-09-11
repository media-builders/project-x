// components/LeadsTable.tsx

export default function LeadsTable() {
  return (
    <table className="contact-table">
    <thead>
      <tr>
        <th className="header-cell">First Name</th>
        <th className="header-cell">Last Name</th>
        <th className="header-cell">Email</th>
        <th className="header-cell">Phone Number</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="data-cell">Jane</td>
        <td className="data-cell">Doe</td>
        <td className="data-cell">jane.doe@example.com</td>
        <td className="data-cell">(555) 123-4567</td>
      </tr>
      <tr>
        <td className="data-cell">John</td>
        <td className="data-cell">Smith</td>
        <td className="data-cell">john.smith@example.com</td>
        <td className="data-cell">(555) 987-6543</td>
      </tr>
    </tbody>
  </table>
  );
}
