export const formatCurrency = (amount) => {
    const num = Number(amount)
    return `${num.toLocaleString('lo-LA')} ₭`
}