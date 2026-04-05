import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;

    if (isMobile) {
      router.replace("/minikit");
    } else {
      router.replace("/home");
    }
  }, [router]);

  return null;
}
