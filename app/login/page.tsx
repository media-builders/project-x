import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import Image from 'next/image'
import ProviderSigninBlock from '@/components/ProviderSigninBlock'
import LoginForm from "@/components/LoginForm"
import BNLogo from "@/public/images/brokernest/SVG/BrokerNest - Logo - WhiteLogo.svg";

export default function Login() {
    return (
        <div className="login-wrapper">
            <Card className="login-card">
                <CardHeader className="login-header">
                    <div className="login-logo">
                        <Link href='/'>
                            <div className="bn-logo">
                                <Image
                                src={BNLogo}
                                alt="BrokerNest.ai Logo"
                                width={40}
                                height={40}
                                priority
                                className="object-contain"
                                />
                            </div>
                        </Link>
                    </div>

                    <CardTitle className="login-title">Welcome to BrokerNest</CardTitle>
                    <CardDescription className="login-description">Choose your preferred login method</CardDescription>
                </CardHeader>

                <CardContent className="login-content">
                    <LoginForm />
                    <div className="login-divider">
                        <div className="divider-line"></div>
                        <div className="divider-text">Or continue with</div>
                    </div>
                    <ProviderSigninBlock />
                </CardContent>

                <CardFooter className="login-footer">
                    <Link className="login-link" href="/forgot-password">
                        Forgot password?
                    </Link>
                    <Link className="login-link" href="/signup">
                        Don&apos;t have an account? Signup
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
