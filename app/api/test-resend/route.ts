import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend('re_Bdmu5oBt_8Wd5LKQDP95Dco7952yV87AT')

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST-RESEND] Starting Resend test...')
    
    const body = await request.json()
    const { email } = body
    
    if (!email) {
      return NextResponse.json(
        { error: 'Missing email parameter' },
        { status: 400 }
      )
    }
    
    console.log('[TEST-RESEND] Testing with email:', email)
    
    // Send a very simple test email
    const { data, error } = await resend.emails.send({
      from: 'SICET Alerts <alerts@sicetenergia.it>',
      to: [email],
      subject: 'Test SICET - Resend',
      html: '<p>Questo è un test di Resend per SICET.</p>',
    })

    if (error) {
      console.error('[TEST-RESEND] Resend error:', error)
      return NextResponse.json(
        { 
          error: 'Resend error',
          details: error
        },
        { status: 500 }
      )
    }

    console.log('[TEST-RESEND] Email sent successfully:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data
    })
    
  } catch (error) {
    console.error('[TEST-RESEND] Error during test:', error)
    return NextResponse.json(
      { 
        error: 'Error during Resend test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 