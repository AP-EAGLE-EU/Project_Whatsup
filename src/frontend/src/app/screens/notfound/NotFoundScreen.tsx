import Link from '../../../components/Link';

export default function NotFoundScreen() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        This page does not exist. <Link to="/">Go to the start page</Link>.
      </p>
    </>
  );
}
