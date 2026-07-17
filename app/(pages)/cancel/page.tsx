import { redirect } from "next/navigation";

// Stripe checkout's cancel_url (backend routes/v1/stripe.js) points here —
// send abandoned checkouts back to the plan picker instead of a 404.
const CancelPage = () => {
  redirect("/subscription");
};

export default CancelPage;
