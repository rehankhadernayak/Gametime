"use client";

import { ParentSignUpForm } from "@/components/auth/ParentSignUpForm";
import styles from "@/styles/auth.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.authPage}>
      <ParentSignUpForm />
    </div>
  );
}
