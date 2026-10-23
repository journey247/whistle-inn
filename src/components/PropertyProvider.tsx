"use client";

import { createContext, useContext } from 'react';
import type { Property } from '@/lib/property-schema';

/**
 * The live property for client components. The root layout loads it with
 * getProperty() and passes it down, so a saved profile reaches every page
 * without each component fetching it.
 */

const PropertyContext = createContext<Property | null>(null);

export function PropertyProvider({ property, children }: { property: Property; children: React.ReactNode }) {
    return <PropertyContext.Provider value={property}>{children}</PropertyContext.Provider>;
}

export function useProperty(): Property {
    const property = useContext(PropertyContext);
    if (!property) {
        throw new Error('useProperty() must be used inside <PropertyProvider>');
    }
    return property;
}
