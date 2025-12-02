

export enum ServiceType {
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  DIAGNOSTIC = 'DIAGNOSTIC',
  ROADSIDE = 'ROADSIDE'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  EN_ROUTE = 'EN_ROUTE',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Vehicle {
  id?: string;
  year: string;
  make: string;
  model: string;
  trim?: string;
  engine?: string;
  mileage?: string;
  vin?: string;
  licensePlate?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  type: ServiceType;
  description: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface MechanicSchedule {
  [key: string]: { start: string; end: string; active: boolean }; // key: 'monday', 'tuesday', etc.
}

export interface Mechanic {
  id: string;
  name: string;
  rating: number;
  jobsCompleted: number;
  avatar: string;
  distance: string;
  eta: string;
  availability: string;
  lat?: number;
  lng?: number;
  bio?: string;
  yearsExperience?: number;
  specialties?: string[];
  reviews?: Review[];
  certifications?: string[];
  schedule?: MechanicSchedule;
  verified?: boolean;
}

export interface MechanicRegistrationData {
  name: string;
  email: string;
  password?: string;
  phone: string;
  bio: string;
  yearsExperience: number;
  specialties: string[];
  certifications: string[];
  zipCode: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isTyping?: boolean;
}

export interface ServiceRecord {
  id: string;
  date: string;
  vehicle: Vehicle;
  services: ServiceItem[];
  total: number;
  mechanicName: string;
  status: BookingStatus;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone?: string;
  address?: string;
  bio?: string;
  vehicles: Vehicle[];
  history: ServiceRecord[];
  isMechanic?: boolean;
  isAdmin?: boolean;
}

export interface JobCompletionDetails {
  description: string;
  parts: string;
  partsCost?: number;
  notes: string;
  collectedPaymentMethod?: 'CARD' | 'CASH' | 'EXTERNAL';
}

export interface AiDiagnosisResult {
  diagnosis: string; 
  potentialCauses: string[];
  recommendedServices: { name: string; duration: string; parts: string[] }[];
}

export interface PaymentMethod {
  id: string;
  type: 'CARD' | 'APPLE_PAY' | 'CASH';
  last4: string;
  brand: string; // 'Visa', 'Mastercard'
  expiry?: string;
}

export interface PriceBreakdown {
  subtotal: number;
  tax: number;
  total: number;
  platformFee: number; // The amount the platform takes
  mechanicPayout: number; // The amount the mechanic receives
}

export interface JobRequest {
  id: string;
  customerId?: string; // Added for security rules
  customerName: string;
  vehicle: string;
  issue: string;
  distance: string;
  
  // Dashboard Visual Coordinates (0-100)
  coordinates: { x: number; y: number };
  
  // Real GPS Data
  location?: GeoLocation; // Customer Location
  driverLocation?: GeoLocation; // Live Mechanic Location
  
  status: 'NEW' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';
  payout: number; // This is now the GROSS amount displayed in lists, but breakdown has details
  urgency: 'HIGH' | 'NORMAL';
  completionDetails?: JobCompletionDetails;
  mechanicId?: string;
  aiAnalysis?: AiDiagnosisResult;
  paymentMethod?: PaymentMethod;
  priceBreakdown?: PriceBreakdown;
  paymentStatus?: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED';
  paymentIntentId?: string; // Stripe Payment Intent ID for capturing later
  createdAt?: string;
}