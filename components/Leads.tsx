// components/LeadsTable.tsx
// Minimal structural tweaks only: wrapper, title, row classes, and optional "is-featured" flag.

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
              <td className="data-cell" data-label="First Name">Jane</td>
              <td className="data-cell" data-label="Last Name">Doe</td>
              <td className="data-cell" data-label="Email">jane.doe@example.com</td>
              <td className="data-cell" data-label="Phone Number">(555) 123-4567</td>
            </tr>

            {/* Add `is-featured` to any row you want accented (gold text like the screenshot) */}
            <tr className="row is-featured">
              <td className="data-cell" data-label="First Name">John</td>
              <td className="data-cell" data-label="Last Name">Smith</td>
              <td className="data-cell" data-label="Email">john.smith@example.com</td>
              <td className="data-cell" data-label="Phone Number">(555) 987-6543</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
