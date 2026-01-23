export const POINTS_PER_DOLLAR = 1

export const tiers = [
    {
        id: "bronze",
        label: "Bronze",
        headline: "Get started",
        minPoints: 0,
        maxPoints: 499,
        perks: ["Welcome bundle worth 200 pts", "Early access to weekly flyers", "Tiered points multiplier A-1"],
        accent: "linear-gradient(135deg, #fef3c7, #fde68a)",
    },
    {
        id: "silver",
        label: "Silver",
        headline: "Earn more rewards",
        minPoints: 500,
        maxPoints: 1499,
        perks: ["Free delivery on orders over $35", "Birthday double points", "Tiered multiplier A-1.5"],
        accent: "linear-gradient(135deg, #c7d2fe, #a5b4fc)",
    },
    {
        id: "gold",
        label: "Gold",
        headline: "Exclusive treatment",
        minPoints: 1500,
        maxPoints: Number.POSITIVE_INFINITY,
        perks: ["Priority support", "Complimentary samples each month", "Tiered multiplier A-2"],
        accent: "linear-gradient(135deg, #fde68a, #fb923c)",
    },
]

export const benefits = ["Buy stuff get points and stuff. idk not finished yet"]

export const getTierByPoints = (points) => {
    const normalized = Number(points ?? 0)
    if (!Number.isFinite(normalized) || normalized < 0) {
        return tiers[0]
    }
    for (let i = tiers.length - 1; i >= 0; i -= 1) {
        if (normalized >= tiers[i].minPoints) {
            return tiers[i]
        }
    }
    return tiers[0]
}

export const vouchers = [
    {
        id: "v_5_off",
        title: "$5 Voucher",
        description: "Get $5 off your next order",
        cost: 500,
        type: "cashback",
        value: 5
    },
    {
        id: "v_10_off",
        title: "$10 Voucher",
        description: "Get $10 off your next order",
        cost: 1000,
        type: "cashback",
        value: 10
    },
    {
        id: "v_25_off",
        title: "$25 Voucher",
        description: "Get $25 off your next order",
        cost: 2000,
        type: "cashback",
        value: 25
    },
    {
        id: "v_free_del",
        title: "Free Delivery",
        description: "Zero delivery fees on your next order",
        cost: 300,
        type: "delivery",
        value: 0
    }
]
