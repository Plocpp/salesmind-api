type PasswordValidationResult = {
  ok: boolean;
  message?: string;
};

function getMinLength() {
  const parsed = Number(process.env.PASSWORD_MIN_LENGTH || 10);
  return Number.isFinite(parsed) && parsed >= 8 ? parsed : 10;
}

export function validatePasswordStrength(passwordInput: string): PasswordValidationResult {
  const password = String(passwordInput || "");
  const minLength = getMinLength();

  if (password.length < minLength) {
    return {
      ok: false,
      message: `A senha deve ter no minimo ${minLength} caracteres.`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 letra maiuscula." };
  }

  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 letra minuscula." };
  }

  if (!/\d/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 numero." };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 caractere especial." };
  }

  return { ok: true };
}
