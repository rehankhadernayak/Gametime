"use client";

import { ParentSignUpForm } from "@/components/auth/ParentSignUpForm";
import styles from "@/styles/auth.module.css";
import meshStyles from "./page.module.css";

export default function SignUpPage() {
  return (
    <div className={meshStyles.meshSignupRoot}>
      <div className={styles.authPage}>
        <ParentSignUpForm />
      </div>
    </div>
  );
}
