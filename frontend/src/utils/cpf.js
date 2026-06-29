/**
 * Valida um CPF utilizando o algoritmo oficial.
 * @param {string} cpf - O CPF a ser validado (pode conter pontuação).
 * @returns {boolean} - true se for válido, false caso contrário.
 */
export function validarCPF(cpf) {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]+/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Elimina CPFs inválidos conhecidos (todos os dígitos iguais)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Valida 1o dígito
  let add = 0;
  for (let i = 0; i < 9; i++) {
    add += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  // Valida 2o dígito
  add = 0;
  for (let i = 0; i < 10; i++) {
    add += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;

  return true;
}
