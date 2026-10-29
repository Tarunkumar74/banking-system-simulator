import { Link } from 'react-router-dom';
export default function NotFound() {
  return <div className="grid min-h-screen place-items-center p-6 text-center"><div>
    <p className="text-6xl font-semibold text-teal-500">404</p><p className="mt-2 text-slate-600">This page doesn't exist.</p>
    <Link to="/" className="mt-4 inline-block rounded-xl bg-navy px-4 py-2.5 text-sm text-white">Back to home</Link></div></div>;
}
