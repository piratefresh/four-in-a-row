export const useRouter = () => {
  return {
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
  };
};

export const usePathname = () => {
  return "";
};

export const useSearchParams = () => {
  return new URLSearchParams();
};

export const useParams = () => {
  return {};
};
