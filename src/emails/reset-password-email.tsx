import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type ResetPasswordEmailProps = {
  url: string;
};

export function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Reset your Word Poker password</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={logoStyle}>Word Poker</Heading>
          </Section>
          <Section style={contentStyle}>
            <Heading style={headingStyle}>Reset your password</Heading>
            <Text style={textStyle}>
              We received a request to reset the password for your Word Poker
              account. Click the button below to choose a new password.
            </Text>
            <Section style={buttonContainerStyle}>
              <Button href={url} style={buttonStyle}>
                Reset password
              </Button>
            </Section>
            <Text style={fallbackStyle}>
              If the button above doesn&apos;t work, copy and paste this link
              into your browser:
            </Text>
            <Text style={linkStyle}>{url}</Text>
            <Text style={expiryStyle}>
              This link will expire in 1 hour.
            </Text>
          </Section>
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              If you didn&apos;t request a password reset, you can safely ignore
              this email. Your password will remain unchanged.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#1a1a1a",
  color: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const containerStyle = {
  margin: "0 auto",
  maxWidth: "480px",
  backgroundColor: "#1a1a1a",
  borderRadius: "12px",
  overflow: "hidden",
};

const headerStyle = {
  backgroundColor: "#114D28",
  padding: "32px 24px",
  textAlign: "center" as const,
};

const logoStyle = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700" as const,
  margin: "0",
};

const contentStyle = {
  padding: "32px 24px",
  backgroundColor: "#1D1D1D",
};

const headingStyle = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "600" as const,
  margin: "0 0 16px",
};

const textStyle = {
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const buttonContainerStyle = {
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const buttonStyle = {
  backgroundColor: "#114D28",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const fallbackStyle = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0 0 8px",
};

const linkStyle = {
  color: "#7ed8a2",
  fontSize: "12px",
  wordBreak: "break-all" as const,
};

const expiryStyle = {
  color: "#94a3b8",
  fontSize: "13px",
  margin: "12px 0 0",
};

const footerStyle = {
  padding: "24px",
  borderTop: "1px solid #303030",
  backgroundColor: "#1D1D1D",
};

const footerTextStyle = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0",
  textAlign: "center" as const,
};