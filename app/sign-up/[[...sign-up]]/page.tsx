import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-black tracking-[0.16em] text-blood">TOKENOMICON</h1>
          <p className="font-vt text-cyan/75 tracking-widest text-sm mt-1">COMPUTE ARCADE</p>
        </div>
        <SignUp forceRedirectUrl="/games?welcome=1" />
      </div>
    </div>
  )
}
