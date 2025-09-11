// components/LeadsTable.tsx

export default function LeadsTable() {
  return (
    <div className="table-viewport">
      <div className="table-card">
        <h2 className="table-title">Leads</h2>

        <table className="contact-table">
          <caption className="sr-only">Lead contacts</caption>
          <thead>
            <tr>
              <th scope="col" className="header-cell">First Name</th>
              <th scope="col" className="header-cell">Last Name</th>
              <th scope="col" className="header-cell">Email</th>
              <th scope="col" className="header-cell">Phone Number</th>
            </tr>
          </thead>
          <tbody>
            <tr className="row">
              <td className="data-cell">Jane</td>
              <td className="data-cell">Doe</td>
              <td className="data-cell">jane.doe@example.com</td>
              <td className="data-cell">(555) 123-4567</td>
            </tr>

            {/* Add this class to any row you want visually emphasized */}
            <tr className="row is-featured">
              <td className="data-cell">John</td>
              <td className="data-cell">Smith</td>
              <td className="data-cell">john.smith@example.com</td>
              <td className="data-cell">(555) 987-6543</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
