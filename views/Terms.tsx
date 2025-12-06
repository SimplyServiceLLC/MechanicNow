import React from 'react';
import { ArrowLeft, Shield, Scale, FileText, AlertTriangle } from 'lucide-react';
import { useNavigate } from '../App';

export const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={20} /> Back
            </button>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms of Service & Liability Waiver</h1>
            <p className="text-slate-300 max-w-2xl">
              Please read these terms carefully before using the MechanicNow platform. By booking a service or registering as a partner, you agree to be bound by these terms.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        </div>

        <div className="p-8 md:p-12 space-y-12">
          
          {/* Section 1: TOS */}
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Scale size={24} /></div>
              <h2 className="text-2xl font-bold text-slate-900">1. Terms of Service</h2>
            </div>
            
            <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">1.1 Platform Role</h3>
                <p>
                  MechanicNow ("The Platform") acts exclusively as a marketplace connector between Vehicle Owners ("Customers") and Independent Mobile Mechanics ("Providers"). MechanicNow is not an auto repair shop and does not directly employ mechanics. We provide the technology to facilitate booking, payments, and communication.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">1.2 Independent Contractor Relationship</h3>
                <p>
                  Providers are independent contractors, not employees of MechanicNow. They provide their own tools, transportation, and expertise. While MechanicNow vets Providers via background checks and certification verification, the Provider is solely responsible for the quality, safety, and timeliness of their work.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">1.3 Customer Responsibilities</h3>
                <p>
                  Customers must provide a safe, flat, and legal location for the repair (e.g., private driveway or permitted parking lot). Customers must disclose all known vehicle issues and modifications accurately. MechanicNow reserves the right to charge a cancellation fee if the environment is deemed unsafe or the vehicle is inaccessible upon the Provider's arrival.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">1.4 Payments & Cancellations</h3>
                <p>
                  Payment is processed securely through the Platform. Customers agree to the quoted price, which may change if on-site diagnosis reveals different needs. Cancellations made less than 2 hours before the scheduled time may incur a $50 cancellation fee.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Liability Waiver */}
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={24} /></div>
              <h2 className="text-2xl font-bold text-slate-900">2. Liability Waiver & Release</h2>
            </div>

            <div className="space-y-6 text-slate-600 text-sm leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">2.1 Release of Liability</h3>
                <p>
                  BY USING THIS SERVICE, YOU HEREBY RELEASE, WAIVE, DISCHARGE, AND COVENANT NOT TO SUE MECHANICNOW, ITS OFFICERS, AGENTS, AND EMPLOYEES FROM ANY AND ALL LIABILITY, CLAIMS, DEMANDS, ACTIONS, AND CAUSES OF ACTION WHATSOEVER ARISING OUT OF OR RELATED TO ANY LOSS, DAMAGE, OR INJURY, INCLUDING DEATH, THAT MAY BE SUSTAINED BY YOU, OR TO ANY PROPERTY BELONGING TO YOU, WHETHER CAUSED BY THE NEGLIGENCE OF THE PROVIDER OR OTHERWISE.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">2.2 Assumption of Risk</h3>
                <p>
                  You understand that automotive repair involves inherent risks, including but not limited to potential damage to the vehicle, fluid leaks, or mechanical failure during testing. You knowingly and freely assume all such risks, both known and unknown, even if arising from the negligence of the Provider.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">2.3 Limited Warranty</h3>
                <p>
                  While MechanicNow facilitates a 12-Month / 12,000-Mile limited warranty on parts and labor for qualifying services, this warranty is void if the vehicle is modified, raced, or if the failure is due to a pre-existing condition unrelated to the specific repair performed.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">2.4 Indemnification</h3>
                <p>
                  You agree to indemnify and hold harmless MechanicNow from any and all liabilities, losses, damages, costs, and expenses (including legal fees) arising from or relating to your use of the platform, your violation of these terms, or your violation of any rights of another party.
                </p>
              </div>
            </div>
          </section>

          <div className="text-center pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-4">Last Updated: October 26, 2024</p>
            <button 
              onClick={() => window.print()}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 mx-auto"
            >
              <FileText size={18} /> Print Agreement
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};