import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function useAppRouter() {
  const navigate = useNavigate();
  return {
    push: (href, options) => navigate(href, options),
    replace: (href) => navigate(href, { replace: true }),
    back: () => navigate(-1)
  };
}

export function useAppSearchParams() {
  const [params] = useSearchParams();
  return params;
}

export function GametimeLink({ href, ...props }) {
  return <Link to={href} {...props} />;
}
