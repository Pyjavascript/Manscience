import { BrowserRouter, Routes, Route } from "react-router-dom";

import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Dashboard from "./pages/Dashboard";
import PractitionerForm from "./pages/PractitionerForm";
import ChatbotQuiz from "./pages/ChatbotQuiz";
import Chatbot from "./pages/Chatbot";
import Community from "./pages/Community";
import SmoothExpertSlider from './pages/SmoothExpertSlider'
import ManasiAi from "./pages/ManasiAi"; 
import FAQSection from "./pages/FAQSection";
import SubscriptionInput from "./components/SubscriptionInput";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SubscriptionInput />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route
          path="*"
          element={<h1 className="text-center mt-20">404 Not Found</h1>}
        />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/admin" element={<Dashboard/>}/>
        <Route path="/practitioner-form" element={<PractitionerForm/>}/>
        <Route path="/chatbot-quiz" element={<ChatbotQuiz/>}/>
        <Route path="/chatbot" element={<Chatbot/>}/>
        <Route path="/community-hub" element={<Community/>}/>
        <Route path="/slider" element={<SmoothExpertSlider/>}/>
        <Route path="/ai" element={<ManasiAi/>}/>
        <Route path="/post/mnri" element={<FAQSection/>}/>

      </Routes>
    </BrowserRouter>
  );
}
