export const studentAddressFields = {
  street: 'address', neighborhood: 'neighborhood', city: 'city',
} as const

export const populationAddressFields = {
  street: 'address.street', neighborhood: 'address.neighborhood', city: 'address.city', state: 'address.state',
} as const
