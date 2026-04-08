import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import EventsPage from "./pages/EventsPage";
import PhotosPage from "./pages/PhotosPage";
import AttendancePage from "./pages/AttendancePage";
import MembersPage from "./pages/MembersPage";
import { CrewProvider } from "./state/CrewContext";

export default function App() {
  return (
    <CrewProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/members" element={<MembersPage />} />
        </Route>
      </Routes>
    </CrewProvider>
  );
}
