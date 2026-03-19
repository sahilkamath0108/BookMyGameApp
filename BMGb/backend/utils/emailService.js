const nodemailer = require('nodemailer');

// Create transporter with environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        
    }
});

/**
 * General purpose email sending function
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @param {string} [text] - Plain text version of the email (optional)
 * @returns {Promise<boolean>} - True if email sent successfully
 */
const sendEmail = async (to, subject, html, text) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        };
        
        // Add plain text version if provided
        if (text) {
            mailOptions.text = text;
        }

        const info = await transporter.sendMail(mailOptions);
        
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

// Send OTP email
const sendOTPEmail = async (to, otp) => {
    const subject = 'Password Reset OTP - BookMyGame';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        🔐 Password Reset Request
                    </h1>
                    <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                        Secure access to your BookMyGame account
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🎮 BookMyGame Security
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            You have requested to reset your password for your BookMyGame account.
                        </p>
                    </div>

                    <!-- OTP Card -->
                    <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🔑 Your Verification Code
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; text-align: center; backdrop-filter: blur(10px);">
                            <span style="color: white; font-weight: bold; font-size: 32px; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.2); padding: 15px 25px; border-radius: 10px; letter-spacing: 5px;">
                                ${otp}
                            </span>
                        </div>
                    </div>

                    <!-- Instructions -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            ⏰ Important Information:
                        </h4>
                        <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 5px;">This OTP will expire in <strong>15 minutes</strong></li>
                            <li style="margin-bottom: 5px;">Use this code to reset your password</li>
                            <li style="margin-bottom: 5px;">Do not share this code with anyone</li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>
                    </div>

                    <!-- Security Notice -->
                    <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            🛡️ Security Notice
                        </h4>
                        <p style="color: #fff3e0; margin: 0; font-size: 14px;">
                            Keep your account secure • Never share your credentials • 
                            Use strong passwords • Enable two-factor authentication when available
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        Stay secure and game on! 🎮
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated security message from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send welcome email to new user
const sendWelcomeEmail = async (to, userName) => {
    const subject = 'Welcome to BookMyGame!';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        🎮 Welcome to BookMyGame!
                    </h1>
                    <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                        Your gaming journey starts here!
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🏆 Hello ${userName}!
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            Thank you for creating an account with BookMyGame. We're excited to have you join our gaming community!
                        </p>
                    </div>

                    <!-- Features Card -->
                    <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🎯 What You Can Do
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <ul style="color: white; margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;"><strong>🏅 Join gaming tournaments</strong> - Compete with players worldwide</li>
                                <li style="margin-bottom: 8px;"><strong>👥 Create your own teams</strong> - Build your dream squad</li>
                                <li style="margin-bottom: 8px;"><strong>📊 Track your statistics</strong> - Monitor your gaming progress</li>
                                <li><strong>🤝 Connect with gamers</strong> - Build lasting friendships</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Call to Action -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3); transition: transform 0.3s ease;">
                            🚀 Start Gaming Now!
                        </a>
                    </div>

                    <!-- Support Info -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            💬 Need Help?
                        </h4>
                        <p style="color: #5a6c7d; margin: 0;">
                            If you have any questions or need assistance, please don't hesitate to contact our support team. 
                            We're here to help you have the best gaming experience possible!
                        </p>
                    </div>

                    <!-- Gaming Tips -->
                    <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            🎯 Pro Gaming Community
                        </h4>
                        <p style="color: #fff3e0; margin: 0; font-size: 14px;">
                            Join tournaments • Build teams • Track progress • 
                            Connect with gamers • Improve your skills • Have fun!
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        Welcome to the gaming community! 🎮
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated welcome message from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send tournament creation confirmation to tournament owner
const sendTournamentCreationEmail = async (to, userName, tournamentName, tournamentDate, tournamentDetails) => {
    const subject = `Tournament Created: ${tournamentName}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        🏆 Tournament Created!
                    </h1>
                    <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                        Your gaming tournament is ready to go!
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🎮 Hello ${userName}!
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            Your tournament has been created successfully. Here are all the details:
                        </p>
                    </div>

                    <!-- Tournament Details Card -->
                    <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🎯 ${tournamentName}
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <div style="display: grid; gap: 8px;">
                                <div style="color: white;"><strong>🆔 Tournament ID:</strong> ${tournamentDetails.tournamentId}</div>
                                <div style="color: white;"><strong>🎮 Game:</strong> ${tournamentDetails.gameName}</div>
                                <div style="color: white;"><strong>📅 Start Date:</strong> ${tournamentDate}</div>
                                <div style="color: white;"><strong>💰 Prize Pool:</strong> ${tournamentDetails.currency} ${tournamentDetails.prizeAmount}</div>
                                <div style="color: white;"><strong>💳 Registration Fee:</strong> ${tournamentDetails.currency} ${tournamentDetails.registrationAmount}</div>
                                <div style="color: white;"><strong>👥 Team Size:</strong> ${tournamentDetails.teamSize} players</div>
                                <div style="color: white;"><strong>🔢 Max Players:</strong> ${tournamentDetails.maxPlayers}</div>
                                <div style="color: white;"><strong>🏅 Format:</strong> ${tournamentDetails.isBracket ? 'Bracket Competition' : 'Regular Tournament'}</div>
                                <div style="color: white;"><strong>📊 Status:</strong> ${tournamentDetails.status}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Management Info -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            ⚙️ Tournament Management:
                        </h4>
                        <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 5px;">Manage your tournament from the admin dashboard</li>
                            <li style="margin-bottom: 5px;">View and approve registrations</li>
                            <li style="margin-bottom: 5px;">Update tournament details as needed</li>
                            <li>Monitor participant activity and statistics</li>
                        </ul>
                    </div>

                    <!-- Success Message -->
                    <div style="background: linear-gradient(135deg, #00b894 0%, #00a085 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            🎉 Congratulations!
                        </h4>
                        <p style="color: #b8f2e6; margin: 0; font-size: 14px;">
                            Your tournament is live • Players can now register • 
                            Manage from dashboard • Track all activities • Good luck!
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        Best of luck with your tournament! 🎮
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated confirmation from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send team creation confirmation to team leader
const sendTeamCreationEmail = async (to, userName, teamName, tournamentName, teamPassword, tournamentDetails) => {
    const subject = `Team Created: ${teamName || 'Your Team'} for ${tournamentName}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        👥 Team Created!
                    </h1>
                    <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                        Your gaming squad is ready for action!
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🎮 Hello ${userName}!
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            Your team has been created successfully for the tournament: <strong>${tournamentName}</strong>
                        </p>
                    </div>

                    <!-- Team Details Card -->
                    <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🏆 ${teamName || 'Your Team'}
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <div style="text-align: center; margin-bottom: 15px;">
                                <span style="color: #e0e0e0; font-size: 14px;">🔒 Team Password:</span>
                                <div style="margin-top: 5px;">
                                    <span style="color: white; font-weight: bold; font-size: 24px; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.2); padding: 10px 20px; border-radius: 8px; letter-spacing: 2px;">
                                        ${teamPassword}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tournament Details -->
                    <div style="background: linear-gradient(135deg, #00b894 0%, #00a085 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🎯 Tournament Details
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <div style="display: grid; gap: 8px;">
                                <div style="color: white;"><strong>🆔 Tournament ID:</strong> ${tournamentDetails.tournamentId}</div>
                                <div style="color: white;"><strong>🎮 Game:</strong> ${tournamentDetails.gameName}</div>
                                <div style="color: white;"><strong>📅 Start Date:</strong> ${tournamentDetails.startDate}</div>
                                <div style="color: white;"><strong>💰 Prize Pool:</strong> ${tournamentDetails.currency} ${tournamentDetails.prizeAmount}</div>
                                <div style="color: white;"><strong>👥 Team Size:</strong> ${tournamentDetails.teamSize} players</div>
                                <div style="color: white;"><strong>🏅 Format:</strong> ${tournamentDetails.isBracket ? 'Bracket Competition' : 'Regular Tournament'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Important Instructions -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            📢 Important Instructions:
                        </h4>
                        <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 5px;"><strong>Share the team password</strong> with your teammates</li>
                            <li style="margin-bottom: 5px;">Your teammates will need this password to join the team</li>
                            <li style="margin-bottom: 5px;">Keep the password secure and only share with trusted players</li>
                            <li>Make sure all team members join before the tournament starts</li>
                        </ul>
                    </div>

                    <!-- Team Building Tips -->
                    <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            🎯 Team Success Tips
                        </h4>
                        <p style="color: #fff3e0; margin: 0; font-size: 14px;">
                            Communicate well • Practice together • Plan strategies • 
                            Support each other • Have fun gaming • Win as a team!
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        Good luck with your team! 🎮
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated team creation confirmation from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send notification to team leader when new member joins
const sendTeamMemberJoinedEmail = async (to, leaderName, memberName, teamName, tournamentName, tournamentDetails) => {
    const subject = `New Member Joined: ${teamName || 'Your Team'}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        🚀 New Team Member!
                    </h1>
                    <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                        Your squad just got stronger!
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🎮 Hello ${leaderName}!
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            A new member has joined your team for the tournament: <strong>${tournamentName}</strong>
                        </p>
                    </div>

                    <!-- New Member Alert -->
                    <div style="background: linear-gradient(135deg, #00b894 0%, #00a085 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🏆 ${teamName || 'Your Team'}
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px); text-align: center;">
                            <div style="margin-bottom: 15px;">
                                <span style="color: #b8f2e6; font-size: 14px;">👤 New Member Joined:</span>
                            </div>
                            <div style="color: white; font-weight: bold; font-size: 24px; background: rgba(0,0,0,0.2); padding: 15px 25px; border-radius: 10px; display: inline-block;">
                                🎮 ${memberName}
                            </div>
                        </div>
                    </div>

                    <!-- Tournament Details -->
                    <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🎯 Tournament Information
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <div style="display: grid; gap: 8px;">
                                <div style="color: white;"><strong>🆔 Tournament ID:</strong> ${tournamentDetails.tournamentId}</div>
                                <div style="color: white;"><strong>🎮 Game:</strong> ${tournamentDetails.gameName}</div>
                                <div style="color: white;"><strong>📅 Start Date:</strong> ${tournamentDetails.startDate}</div>
                                <div style="color: white;"><strong>💰 Prize Pool:</strong> ${tournamentDetails.currency} ${tournamentDetails.prizeAmount}</div>
                                <div style="color: white;"><strong>👥 Team Size:</strong> ${tournamentDetails.teamSize} players</div>
                            </div>
                        </div>
                    </div>

                    <!-- Team Leadership Tips -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            👑 Team Leadership Tips:
                        </h4>
                        <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 5px;">Welcome your new teammate and introduce them to the team</li>
                            <li style="margin-bottom: 5px;">Share team strategies and communication channels</li>
                            <li style="margin-bottom: 5px;">Organize practice sessions before the tournament</li>
                            <li>Keep the team motivated and focused on the goal</li>
                        </ul>
                    </div>

                    <!-- Team Spirit -->
                    <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            🎯 Team Unity
                        </h4>
                        <p style="color: #fff3e0; margin: 0; font-size: 14px;">
                            Welcome new members • Build team chemistry • Practice together • 
                            Share strategies • Support each other • Win as one team!
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        Your team is growing stronger! 🎮
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated team update from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send tournament registration confirmation to player
const sendTournamentRegistrationEmail = async (to, userName, tournamentName, tournamentDate, isTeam = false, teamName = null, tournamentDetails = null) => {
    const registrationType = isTeam ? `team ${teamName || ''}` : 'individual player';
    const subject = `Registration Confirmed: ${tournamentName}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        ✅ Registration Confirmed!
                    </h1>
                    <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                        You're ready to compete!
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🎮 Hello ${userName}!
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            Your registration as ${isTeam ? 'a team member' : 'an individual player'} has been confirmed!
                        </p>
                    </div>

                    <!-- Registration Status -->
                    <div style="background: linear-gradient(135deg, #00b894 0%, #00a085 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🏆 ${tournamentName}
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px); text-align: center;">
                            <div style="margin-bottom: 15px;">
                                <span style="color: #b8f2e6; font-size: 14px;">📋 Registration Type:</span>
                            </div>
                            <div style="color: white; font-weight: bold; font-size: 20px; background: rgba(0,0,0,0.2); padding: 10px 20px; border-radius: 8px; display: inline-block;">
                                ${isTeam ? `👥 Team Player` : `🎯 Solo Player`}
                            </div>
                            ${isTeam ? `
                                <div style="margin-top: 15px;">
                                    <span style="color: #b8f2e6; font-size: 14px;">Team:</span>
                                    <div style="color: white; font-weight: bold; font-size: 18px; margin-top: 5px;">
                                        ${teamName || 'Your Team'}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${tournamentDetails ? `
                        <!-- Tournament Details -->
                        <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                            <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                                🎯 Tournament Information
                            </h3>
                            
                            <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                                <div style="display: grid; gap: 8px;">
                                    <div style="color: white;"><strong>🆔 Tournament ID:</strong> ${tournamentDetails.tournamentId}</div>
                                    <div style="color: white;"><strong>🎮 Game:</strong> ${tournamentDetails.gameName}</div>
                                    <div style="color: white;"><strong>📅 Start Date:</strong> ${tournamentDate}</div>
                                    <div style="color: white;"><strong>💰 Prize Pool:</strong> ${tournamentDetails.currency} ${tournamentDetails.prizeAmount}</div>
                                    <div style="color: white;"><strong>💳 Registration Fee:</strong> ${tournamentDetails.currency} ${tournamentDetails.registrationAmount}</div>
                                    <div style="color: white;"><strong>👥 Team Size:</strong> ${tournamentDetails.teamSize} players</div>
                                    <div style="color: white;"><strong>🏅 Format:</strong> ${tournamentDetails.isBracket ? 'Bracket Competition' : 'Regular Tournament'}</div>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <!-- Simple Tournament Info -->
                        <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                            <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                                🎯 Tournament Date
                            </h3>
                            
                            <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px); text-align: center;">
                                <div style="color: white; font-size: 18px;">
                                    📅 ${tournamentDate}
                                </div>
                            </div>
                        </div>
                    `}

                    <!-- Pre-Tournament Tips -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            🎯 Pre-Tournament Checklist:
                        </h4>
                        <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 5px;">Check your internet connection and gaming setup</li>
                            <li style="margin-bottom: 5px;">Practice and warm up before the tournament</li>
                            <li style="margin-bottom: 5px;">Join any team communication channels</li>
                            <li>Be online 15 minutes before the tournament starts</li>
                        </ul>
                    </div>

                    <!-- Excitement Message -->
                    <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            🎉 We're Excited!
                        </h4>
                        <p style="color: #fff3e0; margin: 0; font-size: 14px;">
                            Ready to compete • Show your skills • Have fun gaming • 
                            Make new friends • Play fair • Win with honor!
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        Good luck in the tournament! 🎮
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated registration confirmation from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send account deletion confirmation email with verification code
const sendAccountDeletionEmail = async (to, userName, verificationCode) => {
    const subject = 'Account Deletion Verification - BookMyGame';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        ⚠️ Account Deletion Request
                    </h1>
                    <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                        Verification required for account deletion
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🎮 Hello ${userName}
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            We received a request to delete your BookMyGame account. To verify this request and proceed with account deletion, please use the verification code below:
                        </p>
                    </div>

                    <!-- Verification Code -->
                    <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🔑 Verification Code
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; text-align: center; backdrop-filter: blur(10px);">
                            <span style="color: white; font-weight: bold; font-size: 32px; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.2); padding: 15px 25px; border-radius: 10px; letter-spacing: 5px;">
                                ${verificationCode}
                            </span>
                        </div>
                    </div>

                    <!-- Warning -->
                    <div style="background: linear-gradient(135deg, #e17055 0%, #d63031 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(225, 112, 85, 0.3);">
                        <h3 style="color: white; margin: 0 0 15px 0; font-size: 20px; text-align: center;">
                            ⚠️ Important Warning
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <p style="color: white; margin: 0; font-weight: bold; text-align: center;">
                                This action is PERMANENT and cannot be undone!
                            </p>
                            <div style="color: #ffebee; margin-top: 15px; font-size: 14px;">
                                <p style="margin: 5px 0;">• All tournament participations will be deleted</p>
                                <p style="margin: 5px 0;">• Team memberships will be removed</p>
                                <p style="margin: 5px 0;">• Game statistics will be lost forever</p>
                                <p style="margin: 5px 0;">• Account data cannot be recovered</p>
                            </div>
                        </div>
                    </div>

                    <!-- Security Notice -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            🛡️ Security Information:
                        </h4>
                        <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 5px;">This verification code will expire in <strong>30 minutes</strong></li>
                            <li style="margin-bottom: 5px;">If you didn't request account deletion, ignore this email</li>
                            <li style="margin-bottom: 5px;">Consider changing your password for added security</li>
                            <li>Contact support if you have any concerns</li>
                        </ul>
                    </div>

                    <!-- Reconsider Message -->
                    <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            🤔 Think Twice
                        </h4>
                        <p style="color: #fff3e0; margin: 0; font-size: 14px;">
                            You'll lose all your gaming history • Tournament achievements • 
                            Team connections • Statistics • Consider deactivating instead of deleting
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        We're sorry to see you go 😢
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated security message from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send notification to administrator about new tournament
const sendTournamentNotificationEmail = async (adminEmail, tournamentDetails) => {
    try {
        const subject = `New Tournament Approval Required: ${tournamentDetails.tournament_Name}`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${subject}</title>
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                            ⚠️ New Tournament Approval Required
                        </h1>
                        <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
                            Admin action needed for tournament review
                        </p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                                🎮 Admin Notification
                            </h2>
                            <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                                A new tournament has been created and requires your approval.
                            </p>
                        </div>

                        <!-- Tournament Details -->
                        <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
                            <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                                🏆 ${tournamentDetails.tournament_Name}
                            </h3>
                            
                            <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                                <div style="display: grid; gap: 8px;">
                                    <div style="color: white;"><strong>🆔 Tournament ID:</strong> ${tournamentDetails.tournamentId}</div>
                                    <div style="color: white;"><strong>🎮 Game:</strong> ${tournamentDetails.GameName || 'Not specified'}</div>
                                    <div style="color: white;"><strong>📅 Start Date:</strong> ${new Date(tournamentDetails.Event_Start_Time).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}</div>
                                    <div style="color: white;"><strong>💰 Prize Pool:</strong> ${tournamentDetails.Currency || 'USD'} ${tournamentDetails.Prize_Amount || 0}</div>
                                    <div style="color: white;"><strong>💳 Registration Fee:</strong> ${tournamentDetails.Currency || 'USD'} ${tournamentDetails.Registration_Amount || 0}</div>
                                    <div style="color: white;"><strong>👥 Team Size:</strong> ${tournamentDetails.Team_Size_Limit || 1} players</div>
                                    <div style="color: white;"><strong>🔢 Max Players:</strong> ${tournamentDetails.Max_Players_Allowed || 0}</div>
                                    <div style="color: white;"><strong>🏅 Format:</strong> ${tournamentDetails.Is_Bracket_Competition ? 'Bracket Competition' : 'Regular Tournament'}</div>
                                    <div style="color: white;"><strong>📊 Status:</strong> ${tournamentDetails.Status || 'Pending Approval'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Admin Actions -->
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                            <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                                ⚙️ Admin Actions Required:
                            </h4>
                            <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 5px;">Review the tournament details and requirements</li>
                                <li style="margin-bottom: 5px;">Verify compliance with platform guidelines</li>
                                <li style="margin-bottom: 5px;">Check prize pool and registration fee amounts</li>
                                <li>Approve or reject the tournament with feedback</li>
                            </ul>
                        </div>

                        <!-- Priority Notice -->
                        <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                            <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                                🚨 Review Priority
                            </h4>
                            <p style="color: #fff3e0; margin: 0; font-size: 14px;">
                                Timely review needed • Tournament creator waiting • 
                                Check all details • Provide clear feedback • Maintain quality standards
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background: #2c3e50; padding: 25px; text-align: center;">
                        <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                            Admin Dashboard Action Required 🎮
                        </p>
                        <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                            This is an automated admin notification from BookMyGame.
                        </p>
                    </div>

                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject,
            html
        };

        await transporter.sendMail(mailOptions);
        
    } catch (error) {
        console.error('Error sending tournament notification email:', error);
        throw error;
    }
};

// Send tournament approval notification to tournament creator
const sendTournamentApprovalEmail = async (to, userName, tournamentName, isApproved, tournamentDetails = null) => {
    const approvalStatus = isApproved ? 'Approved' : 'Rejected';
    const subject = `Tournament ${approvalStatus}: ${tournamentName}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, ${isApproved ? '#00b894 0%, #00a085 100%' : '#e17055 0%, #d63031 100%'}); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        ${isApproved ? '✅ Tournament Approved!' : '❌ Tournament Rejected'}
                    </h1>
                    <p style="color: ${isApproved ? '#b8f2e6' : '#ffebee'}; margin: 10px 0 0 0; font-size: 16px;">
                        ${isApproved ? 'Your tournament is now live!' : 'Review feedback and try again'}
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                            🎮 Hello ${userName}!
                        </h2>
                        <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                            ${isApproved 
                                ? 'Great news! Your tournament has been approved and is now visible to players.'
                                : 'We regret to inform you that your tournament has been rejected.'
                            }
                        </p>
                    </div>

                    <!-- Tournament Status -->
                    <div style="background: linear-gradient(135deg, ${isApproved ? '#74b9ff 0%, #0984e3 100%' : '#fdcb6e 0%, #e17055 100%'}); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(${isApproved ? '116, 185, 255' : '253, 203, 110'}, 0.3);">
                        <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                            🏆 ${tournamentName}
                        </h3>
                        
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px); text-align: center;">
                            <div style="color: white; font-weight: bold; font-size: 24px; background: rgba(0,0,0,0.2); padding: 15px 25px; border-radius: 10px; display: inline-block;">
                                ${isApproved ? '✅ APPROVED' : '❌ REJECTED'}
                            </div>
                        </div>
                    </div>

                    ${isApproved && tournamentDetails ? `
                        <!-- Tournament Details -->
                        <div style="background: linear-gradient(135deg, #00b894 0%, #00a085 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);">
                            <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                                🎯 Tournament Details
                            </h3>
                            
                            <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                                <div style="display: grid; gap: 8px;">
                                    <div style="color: white;"><strong>🆔 Tournament ID:</strong> ${tournamentDetails.tournamentId}</div>
                                    <div style="color: white;"><strong>🎮 Game:</strong> ${tournamentDetails.gameName}</div>
                                    <div style="color: white;"><strong>📅 Start Date:</strong> ${tournamentDetails.startDate}</div>
                                    <div style="color: white;"><strong>💰 Prize Pool:</strong> ${tournamentDetails.currency} ${tournamentDetails.prizeAmount}</div>
                                    <div style="color: white;"><strong>💳 Registration Fee:</strong> ${tournamentDetails.currency} ${tournamentDetails.registrationAmount}</div>
                                    <div style="color: white;"><strong>👥 Team Size:</strong> ${tournamentDetails.teamSize} players</div>
                                    <div style="color: white;"><strong>🔢 Max Players:</strong> ${tournamentDetails.maxPlayers}</div>
                                    <div style="color: white;"><strong>🏅 Format:</strong> ${tournamentDetails.isBracket ? 'Bracket Competition' : 'Regular Tournament'}</div>
                                </div>
                            </div>
                        </div>
                    ` : !isApproved && tournamentDetails ? `
                        <!-- Rejected Tournament Info -->
                        <div style="background: linear-gradient(135deg, #e17055 0%, #d63031 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(225, 112, 85, 0.3);">
                            <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                                📋 Tournament Information
                            </h3>
                            
                            <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                                <div style="color: white; text-align: center;">
                                    <strong>🆔 Tournament ID:</strong> ${tournamentDetails.tournamentId}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Action Instructions -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                            ${isApproved ? '🚀 Next Steps:' : '📞 Need Help?'}
                        </h4>
                        <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                            ${isApproved ? `
                                <li style="margin-bottom: 5px;">Manage your tournament from the admin dashboard</li>
                                <li style="margin-bottom: 5px;">View and approve player registrations</li>
                                <li style="margin-bottom: 5px;">Update tournament details as needed</li>
                                <li>Monitor participant activity and statistics</li>
                            ` : `
                                <li style="margin-bottom: 5px;">Contact our support team for feedback details</li>
                                <li style="margin-bottom: 5px;">Review tournament guidelines and policies</li>
                                <li style="margin-bottom: 5px;">Make necessary adjustments and resubmit</li>
                                <li>Ensure all requirements are met before resubmission</li>
                            `}
                        </ul>
                    </div>

                    <!-- Status Message -->
                    <div style="background: linear-gradient(135deg, ${isApproved ? '#fdcb6e 0%, #e17055 100%' : '#74b9ff 0%, #0984e3 100%'}); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                            ${isApproved ? '🎉 Congratulations!' : '💪 Don\'t Give Up!'}
                        </h4>
                        <p style="color: ${isApproved ? '#fff3e0' : '#e0e0e0'}; margin: 0; font-size: 14px;">
                            ${isApproved 
                                ? 'Your tournament is live • Players can register • Manage from dashboard • Good luck!'
                                : 'Review feedback • Improve your submission • Try again • We\'re here to help!'
                            }
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2c3e50; padding: 25px; text-align: center;">
                    <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
                        ${isApproved ? 'Best of luck with your tournament! 🎮' : 'Keep creating amazing tournaments! 🎮'}
                    </p>
                    <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                        This is an automated approval notification from BookMyGame.
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
    
    return sendEmail(to, subject, html);
};

// Send room details email to participants
const sendRoomDetailsEmail = async (to, userName, tournamentName, roomCode, roomPassword, isMatchupSpecific = false, matchupDetails = null) => {
  try {
    const subject = isMatchupSpecific 
      ? `🎮 Match Room Details - ${tournamentName}`
      : `🎮 Tournament Room Details - ${tournamentName}`;

    const matchupInfo = isMatchupSpecific && matchupDetails 
      ? `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <h3 style="color: white; margin: 0; font-size: 18px;">⚔️ Match Details</h3>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">
            Round: ${matchupDetails.round} | 
            ${matchupDetails.opponentTeam ? `VS: ${matchupDetails.opponentTeam}` : 'Waiting for opponent'}
          </p>
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              🎮 ${isMatchupSpecific ? 'Match' : 'Tournament'} Room Access
            </h1>
            <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
              Your gaming session details are ready!
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                🏆 ${tournamentName}
              </h2>
              <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                Hello <strong style="color: #F05454;">${userName}</strong>! 
                ${isMatchupSpecific ? 'Your match room is ready.' : 'The tournament room has been configured.'}
              </p>
            </div>

            ${matchupInfo}

            <!-- Room Details Card -->
            <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
              <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                🔑 Room Access Details
              </h3>
              
              ${roomCode ? `
                <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; margin-bottom: 15px; backdrop-filter: blur(10px);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #e0e0e0; font-size: 14px;">🎯 Room Code:</span>
                    <span style="color: white; font-weight: bold; font-size: 18px; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.2); padding: 5px 10px; border-radius: 5px;">
                      ${roomCode}
                    </span>
                  </div>
                </div>
              ` : ''}
              
              ${roomPassword ? `
                <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #e0e0e0; font-size: 14px;">🔒 Room Password:</span>
                    <span style="color: white; font-weight: bold; font-size: 18px; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.2); padding: 5px 10px; border-radius: 5px;">
                      ${roomPassword}
                    </span>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Instructions -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0;">
              <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                📋 Instructions:
              </h4>
              <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 5px;">Use the room code to join the game lobby</li>
                <li style="margin-bottom: 5px;">Enter the password when prompted</li>
                <li style="margin-bottom: 5px;">Make sure to join on time for your ${isMatchupSpecific ? 'match' : 'tournament'}</li>
                <li>Contact support if you experience any issues</li>
              </ul>
            </div>

            <!-- Gaming Tips -->
            <div style="background: linear-gradient(135deg, #00b894 0%, #00a085 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
              <h4 style="color: white; margin: 0 0 10px 0; font-size: 16px;">
                🎯 Pro Gaming Tips
              </h4>
              <p style="color: #b8f2e6; margin: 0; font-size: 14px;">
                Check your internet connection • Warm up before the match • 
                Have your gaming setup ready • Stay hydrated and focused!
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2c3e50; padding: 25px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              Good luck and have fun gaming! 🎮
            </p>
            <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
              This is an automated message from the tournament system.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const text = `
      ${subject}
      
      Hello ${userName}!
      
      ${isMatchupSpecific ? 'Your match room details for' : 'The tournament room details for'} "${tournamentName}" are ready:
      
      ${roomCode ? `Room Code: ${roomCode}` : ''}
      ${roomPassword ? `Room Password: ${roomPassword}` : ''}
      
      ${isMatchupSpecific && matchupDetails ? `
      Match Details:
      - Round: ${matchupDetails.round}
      ${matchupDetails.opponentTeam ? `- Opponent: ${matchupDetails.opponentTeam}` : '- Waiting for opponent'}
      ` : ''}
      
      Instructions:
      - Use the room code to join the game lobby
      - Enter the password when prompted
      - Make sure to join on time
      
      Good luck and have fun gaming!
    `;

    await sendEmail(to, subject, html, text);
    
    
  } catch (error) {
    console.error('Error sending room details email:', error);
    throw error;
  }
};

// Send stats update notification email to participants
const sendStatsUpdateEmail = async (to, userName, tournamentName, statsData, isBracketTournament = false, matchupDetails = null) => {
  try {
    const subject = isBracketTournament 
      ? `📊 Match Stats Updated - ${tournamentName}`
      : `📊 Tournament Stats Updated - ${tournamentName}`;

    // Format stats display based on type
    const formatStats = (stats) => {
      if (!stats || typeof stats !== 'object') return 'No stats available';
      
      const statEntries = Object.entries(stats);
      if (statEntries.length === 0) return 'No stats recorded';
      
      return statEntries.map(([key, value]) => {
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        return `<li><strong>${capitalizedKey}:</strong> ${value}</li>`;
      }).join('');
    };

    const matchupInfo = isBracketTournament && matchupDetails 
      ? `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <h3 style="color: white; margin: 0; font-size: 18px;">⚔️ Match Information</h3>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">
            Round: ${matchupDetails.round || 'N/A'} | 
            ${matchupDetails.opponentTeam ? `VS: ${matchupDetails.opponentTeam}` : 'Match Details'}
          </p>
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F05454 0%, #e74c3c 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              📊 Stats Update Notification
            </h1>
            <p style="color: #ffebee; margin: 10px 0 0 0; font-size: 16px;">
              Your gaming performance has been recorded!
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                🏆 ${tournamentName}
              </h2>
              <p style="color: #7f8c8d; margin: 0; font-size: 16px;">
                Hello <strong style="color: #F05454;">${userName}</strong>! 
                Your ${isBracketTournament ? 'match' : 'tournament'} statistics have been updated by the tournament administrator.
              </p>
            </div>

            ${matchupInfo}

            <!-- Stats Card -->
            <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 5px 15px rgba(116, 185, 255, 0.3);">
              <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                🎯 Your Performance Stats
              </h3>
              
              <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                <ul style="color: white; margin: 0; padding-left: 20px; list-style-type: none;">
                  ${formatStats(statsData)}
                </ul>
              </div>
            </div>

            <!-- Position Info (for non-bracket tournaments) -->
            ${!isBracketTournament && statsData && statsData.position ? `
              <div style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                <h4 style="color: white; margin: 0 0 10px 0; font-size: 18px;">
                  🏅 Tournament Position
                </h4>
                <p style="color: #fff3e0; margin: 0; font-size: 24px; font-weight: bold;">
                  #${statsData.position}
                </p>
              </div>
            ` : ''}

            <!-- Motivational Message -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #F05454; margin: 20px 0; text-align: center;">
              <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">
                🎮 Keep Gaming!
              </h4>
              <p style="color: #5a6c7d; margin: 0;">
                ${isBracketTournament 
                  ? "Great job on your match! Keep up the excellent gameplay for upcoming rounds." 
                  : "Your tournament performance has been recorded. Continue striving for excellence!"}
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2c3e50; padding: 25px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              Keep up the great work! 🎯
            </p>
            <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
              This is an automated message from the tournament system.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const text = `
      ${subject}
      
      Hello ${userName}!
      
      Your ${isBracketTournament ? 'match' : 'tournament'} statistics for "${tournamentName}" have been updated:
      
      ${statsData ? Object.entries(statsData).map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join('\n') : 'No stats available'}
      
      ${isBracketTournament && matchupDetails ? `
      Match Details:
      - Round: ${matchupDetails.round || 'N/A'}
      ${matchupDetails.opponentTeam ? `- Opponent: ${matchupDetails.opponentTeam}` : ''}
      ` : ''}
      
      ${!isBracketTournament && statsData && statsData.position ? `Tournament Position: #${statsData.position}` : ''}
      
      Keep up the great work!
    `;

    await sendEmail(to, subject, html, text);
    
    
  } catch (error) {
    console.error('Error sending stats update email:', error);
    throw error;
  }
};

module.exports = {
    sendEmail,
    sendOTPEmail,
    sendWelcomeEmail,
    sendTournamentCreationEmail,
    sendTeamCreationEmail,
    sendTeamMemberJoinedEmail,
    sendTournamentRegistrationEmail,
    sendAccountDeletionEmail,
    sendTournamentNotificationEmail,
    sendTournamentApprovalEmail,
    sendRoomDetailsEmail,
    sendStatsUpdateEmail
}; 