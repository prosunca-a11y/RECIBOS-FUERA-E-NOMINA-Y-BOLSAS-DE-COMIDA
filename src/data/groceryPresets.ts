import { GroceryItem } from '../types';

export interface GroceryPreset {
  id: string;
  name: string;
  description: string;
  defaultUSD: number;
  items: GroceryItem[];
}

export const GROCERY_PRESETS: Record<string, GroceryPreset> = {
  basica: {
    id: 'basica',
    name: 'Cesta Básica Familiar',
    description: 'Víveres esenciales de la canasta básica venezolana (Art. 105 LOTTT)',
    defaultUSD: 55,
    items: [
      { id: 'gb-1', name: 'Harina de Maíz Precocida (1 kg)', quantity: 4, unit: 'kg' },
      { id: 'gb-2', name: 'Arroz Blanco de Mesa Tipo I (1 kg)', quantity: 4, unit: 'kg' },
      { id: 'gb-3', name: 'Pasta Alimenticia Larga/Corta (1 kg)', quantity: 3, unit: 'kg' },
      { id: 'gb-4', name: 'Aceite Vegetal Comestible (1 L)', quantity: 2, unit: 'litros' },
      { id: 'gb-5', name: 'Granos Seleccionados (Caraotas Negras / Lentejas)', quantity: 2, unit: 'kg' },
      { id: 'gb-6', name: 'Azúcar Refinada / Azúcar Morena (1 kg)', quantity: 2, unit: 'kg' },
      { id: 'gb-7', name: 'Leche en Polvo Completa (900g)', quantity: 1, unit: 'paquetes' },
      { id: 'gb-8', name: 'Atún enlatado en agua/aceite (140g)', quantity: 4, unit: 'latas' },
      { id: 'gb-9', name: 'Sardinas en salsa de tomate (170g)', quantity: 3, unit: 'latas' },
      { id: 'gb-10', name: 'Café Molido Artesanal/Gourmet (250g)', quantity: 2, unit: 'paquetes' },
    ],
  },
  proteica: {
    id: 'proteica',
    name: 'Cesta Reforzada Proteica',
    description: 'Víveres con alto valor nutricional y proteínas para el sustento familiar',
    defaultUSD: 75,
    items: [
      { id: 'gp-1', name: 'Pollo Entero Beneficiado / Cortes de Pollo (2 kg)', quantity: 2, unit: 'kg' },
      { id: 'gp-2', name: 'Carne de Res de Primera para Guisar/Moler (2 kg)', quantity: 2, unit: 'kg' },
      { id: 'gp-3', name: 'Cartón de Huevos Frescos (30 unidades)', quantity: 1, unit: 'unidades' },
      { id: 'gp-4', name: 'Atún enlatado al natural (140g)', quantity: 6, unit: 'latas' },
      { id: 'gp-5', name: 'Queso Blanco Llanero Duro (1 kg)', quantity: 1, unit: 'kg' },
      { id: 'gp-6', name: 'Granos: Lentejas y Caraotas Seleccionadas (1 kg)', quantity: 2, unit: 'kg' },
      { id: 'gp-7', name: 'Leche en Polvo Completa Enriquecida (900g)', quantity: 2, unit: 'paquetes' },
      { id: 'gp-8', name: 'Avena en Hojuelas Tradicional (400g)', quantity: 2, unit: 'paquetes' },
    ],
  },
  higiene: {
    id: 'higiene',
    name: 'Cesta Higiene y Aseo Personal',
    description: 'Dotación de artículos de higiene personal y limpieza esencial del hogar',
    defaultUSD: 35,
    items: [
      { id: 'gh-1', name: 'Jabón de Tocador en Barra (125g)', quantity: 4, unit: 'unidades' },
      { id: 'gh-2', name: 'Crema Dental Triple Acción Fluorada (100 ml)', quantity: 2, unit: 'unidades' },
      { id: 'gh-3', name: 'Champú para el Cabello (400 ml)', quantity: 1, unit: 'unidades' },
      { id: 'gh-4', name: 'Detergente en Polvo Multiuso (1 kg)', quantity: 2, unit: 'kg' },
      { id: 'gh-5', name: 'Lavaplatos en Crema / Líquido Desengrasante (500g)', quantity: 1, unit: 'unidades' },
      { id: 'gh-6', name: 'Papel Higiénico Doble Hoja (Paquete de 4 rollos)', quantity: 2, unit: 'paquetes' },
      { id: 'gh-7', name: 'Cloro Desinfectante Multiuso (1 L)', quantity: 1, unit: 'litros' },
    ],
  },
  completa: {
    id: 'completa',
    name: 'Cesta Integral Mixta (Alimentos + Higiene)',
    description: 'Dotación integral combinando víveres de primera necesidad y productos de higiene',
    defaultUSD: 85,
    items: [
      { id: 'gc-1', name: 'Harina de Maíz Precocida (1 kg)', quantity: 4, unit: 'kg' },
      { id: 'gc-2', name: 'Arroz Blanco de Mesa Tipo I (1 kg)', quantity: 4, unit: 'kg' },
      { id: 'gc-3', name: 'Pasta Alimenticia (1 kg)', quantity: 3, unit: 'kg' },
      { id: 'gc-4', name: 'Aceite Vegetal Comestible (1 L)', quantity: 2, unit: 'litros' },
      { id: 'gc-5', name: 'Granos Seleccionados (Caraotas Negras / Lentejas)', quantity: 2, unit: 'kg' },
      { id: 'gc-6', name: 'Atún enlatado al natural (140g)', quantity: 4, unit: 'latas' },
      { id: 'gc-7', name: 'Leche en Polvo Completa (900g)', quantity: 1, unit: 'paquetes' },
      { id: 'gc-8', name: 'Café Molido Gourmet (250g)', quantity: 2, unit: 'paquetes' },
      { id: 'gc-9', name: 'Jabón de Tocador en Barra (125g)', quantity: 4, unit: 'unidades' },
      { id: 'gc-10', name: 'Crema Dental Fluorada (100 ml)', quantity: 2, unit: 'unidades' },
      { id: 'gc-11', name: 'Detergente en Polvo (1 kg)', quantity: 2, unit: 'kg' },
      { id: 'gc-12', name: 'Papel Higiénico Doble Hoja (Paquete 4 rollos)', quantity: 2, unit: 'paquetes' },
    ],
  },
};
