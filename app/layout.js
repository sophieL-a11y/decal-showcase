import "./globals.css";

export const metadata = {
  title: "Full-Stack DeCal Showcase",
  description: "Upload your project. Instructors can review every submission.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
