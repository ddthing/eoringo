import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { LocalMigrationLauncher } from "./LocalMigrationLauncher";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui";

type AccountSyncBootstrapGateProps = {
  userId: string;
};

const title = "\uacc4\uc815 \ub370\uc774\ud130 \ud655\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4";
const description =
  "\ub2e4\ub978 Google \uacc4\uc815\uc758 \ub370\uc774\ud130\uac00 \uc11e\uc774\uc9c0 \uc54a\ub3c4\ub85d, \uc774 \uae30\uae30\uc758 \ub370\uc774\ud130\uc640 \ud604\uc7ac \uacc4\uc815\uc758 \ub370\uc774\ud130\ub97c \uba3c\uc800 \ud655\uc778\ud569\ub2c8\ub2e4.";
const signOutLabel = "\ub85c\uadf8\uc544\uc6c3";

export const AccountSyncBootstrapGate = ({ userId }: AccountSyncBootstrapGateProps) => {
  const auth = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await auth.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-2xl items-center px-4 py-8">
      <Card className="w-full p-1">
        <CardHeader className="p-5 sm:p-6">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-card-soft text-ink-muted">
            <ShieldCheck aria-hidden size={22} />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
          <LocalMigrationLauncher userId={userId} />
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => void handleSignOut()}
            loading={isSigningOut}
            disabled={isSigningOut}
            loadingLabel="..."
          >
            {signOutLabel}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
