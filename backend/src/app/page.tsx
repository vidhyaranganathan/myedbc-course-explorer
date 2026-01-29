export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>BC Course Finder API</h1>
      <p>API backend for BC Course Finder application.</p>
      <h2>Available Endpoints</h2>
      <ul>
        <li>
          <code>GET /api/health</code> - Health check
        </li>
        <li>
          <code>GET /api/courses/search</code> - Search courses
        </li>
        <li>
          <code>GET /api/courses/filters</code> - Get filter options
        </li>
        <li>
          <code>GET /api/courses/suggest</code> - Autocomplete suggestions
        </li>
        <li>
          <code>GET /api/courses/[code]</code> - Get course by code
        </li>
        <li>
          <code>POST /api/analytics/search</code> - Log search analytics
        </li>
      </ul>
    </main>
  );
}
