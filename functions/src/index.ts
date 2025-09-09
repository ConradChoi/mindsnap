/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

// 이메일 발송을 위한 Cloud Function
export const sendVerificationEmail = functions.https.onCall(async (data: any) => {
  try {
    const {email, verificationCode} = data;

    // 입력 데이터 검증
    if (!email || !verificationCode) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "이메일과 인증번호가 필요합니다.",
      );
    }

    // 이메일 발송 설정
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "jhc@ylia.io", // 발신자 이메일
        pass: functions.config().email.password, // 환경 변수에서 비밀번호 가져오기
      },
    });

    // 이메일 내용
    const mailOptions = {
      from: "\"MindSnap\" <jhc@ylia.io>",
      to: email,
      subject: "[MindSnap] 이메일 찾기 인증번호",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">MindSnap</h1>
            <p style="color: #666; margin: 10px 0;">마음을 기록하고 성장하는 시간</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: #333; margin-bottom: 20px;">이메일 찾기 인증번호</h2>
            
            <p style="color: #666; margin-bottom: 20px;">
              안녕하세요!<br>
              MindSnap 이메일 찾기를 요청하셨습니다.
            </p>
            
            <div style="background-color: #f8f9fa; border: 2px solid #007bff; 
                 border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0;">
              <p style="color: #007bff; font-size: 14px; margin: 0 0 10px 0;">
                인증번호
              </p>
              <p style="color: #007bff; font-size: 32px; font-weight: bold; 
                   letter-spacing: 5px; margin: 0;">
                ${verificationCode}
              </p>
            </div>
            
            <p style="color: #666; margin-bottom: 20px;">
              위의 인증번호를 입력하여 이메일 찾기를 완료해주세요.<br>
              이 인증번호는 10분간 유효합니다.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 MindSnap. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    // 이메일 발송
    const result = await transporter.sendMail(mailOptions);

    console.log("Verification email sent successfully:", result.messageId);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "이메일 발송 중 오류가 발생했습니다.",
    );
  }
});

    // 비밀번호 재설정 이메일 발송을 위한 Cloud Function
export const sendPasswordResetEmail = functions.https.onCall(async (data: any) => {
  try {
    const {email, resetLink} = data;

    // 입력 데이터 검증
    if (!email || !resetLink) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "이메일과 재설정 링크가 필요합니다.",
      );
    }

    // 이메일 발송 설정
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "jhc@ylia.io",
        pass: functions.config().email.password,
      },
    });

    // 이메일 내용
    const mailOptions = {
      from: "\"MindSnap\" <jhc@ylia.io>",
      to: email,
      subject: "[MindSnap] 비밀번호 재설정",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">MindSnap</h1>
            <p style="color: #666; margin: 10px 0;">마음을 기록하고 성장하는 시간</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: #333; margin-bottom: 20px;">비밀번호 재설정</h2>
            
            <p style="color: #666; margin-bottom: 20px;">
              안녕하세요!<br>
              MindSnap 비밀번호 재설정을 요청하셨습니다.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; 
                        font-weight: bold;">
                비밀번호 재설정하기
              </a>
            </div>
            
            <p style="color: #666; margin-bottom: 20px;">
              위의 버튼을 클릭하여 비밀번호를 재설정해주세요.<br>
              이 링크는 1시간간 유효합니다.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 MindSnap. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    // 이메일 발송
    const result = await transporter.sendMail(mailOptions);

    console.log("Password reset email sent successfully:", result.messageId);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "이메일 발송 중 오류가 발생했습니다.",
    );
  }
});
