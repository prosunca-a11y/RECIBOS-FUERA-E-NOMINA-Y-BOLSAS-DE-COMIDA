import React, { useState, useEffect, useRef } from 'react';
import { BenefitReceipt, CloudArchiveFile, CompanyConfig, CorporateFoodPurchaseInvoice, Employee, TriadStatus, NominusConfig, NominusSyncResult } from './types';
import {
  INITIAL_COMPANIES,
  INITIAL_COMPANY,
  INITIAL_EMPLOYEES,
  INITIAL_RECEIPTS,
  INITIAL_CORPORATE_INVOICES,
} from './data/initialData';
import {
  auth,
  User,
  onAuthStateChanged,
  subscribeToUserCloudData,
  saveCompanyToCloud,
  deleteCompanyFromCloud,
  saveEmployeeToCloud,
  deleteEmployeeFromCloud,
  saveReceiptToCloud,
  saveInvoiceToCloud,
  archiveReceiptDocumentToCloud,
  syncAllLocalDataToCloud,
} from './firebase';
import { fetchNominusBCVRate } from './utils/nominusBridge';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CompaniesManager } from './components/CompaniesManager';
import { ReceiptGenerator } from './components/ReceiptGenerator';
import { FoodBasketModule } from './components/FoodBasketModule';
import { ContractGenerator } from './components/ContractGenerator';
import { TheVault } from './components/TheVault';
import { CloudDatabasePanel } from './components/CloudDatabasePanel';
import { SeniatAudit } from './components/SeniatAudit';
import { EmployeesManager } from './components/EmployeesManager';
import { NominusConnector } from './components/NominusConnector';
import { ReceiptModal } from './components/ReceiptModal';
import { BatchPrintModal } from './components/BatchPrintModal';

export default function App() {
  // Persistence with localStorage
  const [companies, setCompanies] = useState<CompanyConfig[]>(() => {
    const saved = localStorage.getItem('bonos_ve_companies');
    if (saved) {
      try {
        const parsed: CompanyConfig[] = JSON.parse(saved);
        // Ensure all INITIAL_COMPANIES (e.g., CRISBAORCA 2009, C.A.) are available
        const existingRifs = new Set(parsed.map((c) => c.rif.replace(/[^A-Z0-9]/gi, '')));
        const missing = INITIAL_COMPANIES.filter(
          (c) => !existingRifs.has(c.rif.replace(/[^A-Z0-9]/gi, ''))
        );
        if (missing.length > 0) {
          return [...parsed, ...missing];
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing stored companies:', e);
      }
    }
    return INITIAL_COMPANIES;
  });

  const [company, setCompany] = useState<CompanyConfig>(() => {
    const saved = localStorage.getItem('bonos_ve_company');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('bonos_ve_employees');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Error parsing bonos_ve_employees:', err);
      }
    }
    return INITIAL_EMPLOYEES;
  });

  const [receipts, setReceipts] = useState<BenefitReceipt[]>(() => {
    const saved = localStorage.getItem('bonos_ve_receipts');
    return saved ? JSON.parse(saved) : INITIAL_RECEIPTS;
  });

  const [invoices, setInvoices] = useState<CorporateFoodPurchaseInvoice[]>(() => {
    const saved = localStorage.getItem('bonos_ve_invoices');
    return saved ? JSON.parse(saved) : INITIAL_CORPORATE_INVOICES;
  });

  // Nominus Integration Configuration State
  const [nominusConfig, setNominusConfig] = useState<NominusConfig>(() => {
    const saved = localStorage.getItem('bonos_ve_nominus_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing nominus config:', e);
      }
    }
    return {
      apiUrl: '',
      apiKey: 'NOMINUS_SECRET_2026',
      autoSync: true,
      status: 'disconnected',
      isEmbedded: false,
      hostingFolder: '/public_html/bonos',
    };
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedReceipt, setSelectedReceipt] = useState<BenefitReceipt | null>(null);
  const [isPreviewModal, setIsPreviewModal] = useState<boolean>(false);
  const [batchPrintReceipts, setBatchPrintReceipts] = useState<BenefitReceipt[] | null>(null);

  // Firebase Auth & Cloud Files State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [cloudFiles, setCloudFiles] = useState<CloudArchiveFile[]>([]);
  const hasSeededCloudRef = useRef<boolean>(false);

  // Track Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthReady(true);
      if (!u) {
        setCloudFiles([]);
        hasSeededCloudRef.current = false;
      }
    });
    return () => unsub();
  }, []);

  // Attach Firestore Real-Time Listeners when authenticated
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const unsubCloud = subscribeToUserCloudData(firebaseUser.uid, {
      onCompanies: (cloudCompanies) => {
        if (cloudCompanies.length > 0) {
          setCompanies(cloudCompanies);
          setCompany((prev) => cloudCompanies.find((c) => c.id === prev.id) || cloudCompanies[0]);
        } else if (!hasSeededCloudRef.current) {
          hasSeededCloudRef.current = true;
          syncAllLocalDataToCloud({ companies, employees, receipts, invoices }).catch((err) =>
            console.error('Error seeding initial cloud data:', err)
          );
        }
      },
      onEmployees: (cloudEmployees) => {
        if (cloudEmployees.length > 0) {
          setEmployees(cloudEmployees);
        }
      },
      onReceipts: (cloudReceipts) => {
        if (cloudReceipts.length > 0) {
          setReceipts(cloudReceipts);
        }
      },
      onInvoices: (cloudInvoices) => {
        if (cloudInvoices.length > 0) {
          setInvoices(cloudInvoices);
        }
      },
      onCloudFiles: (files) => {
        setCloudFiles(files);
      },
    });

    return () => unsubCloud();
  }, [authReady, firebaseUser]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('bonos_ve_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('bonos_ve_company', JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem('bonos_ve_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('bonos_ve_receipts', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('bonos_ve_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('bonos_ve_nominus_config', JSON.stringify(nominusConfig));
  }, [nominusConfig]);

  // Handler: Update BCV Rate
  const handleUpdateBCVRate = (newRate: number, fechaOverride?: string) => {
    const fecha = fechaOverride || new Date().toISOString().split('T')[0];
    setCompany((prev) => {
      const updated = {
        ...prev,
        tasaBCV: newRate,
        fechaTasaBCV: fecha,
      };
      setCompanies((all) =>
        all.map((c) => {
          const updatedComp = { ...c, tasaBCV: newRate, fechaTasaBCV: fecha };
          saveCompanyToCloud(updatedComp).catch(console.error);
          return updatedComp;
        })
      );
      return updated;
    });
  };

  // Handler: Synchronize Official BCV Rate with Nominus
  const handleSyncBCVFromNominus = async () => {
    const res = await fetchNominusBCVRate(nominusConfig, company.tasaBCV);
    handleUpdateBCVRate(res.tasaBCV, res.fechaTasaBCV);
    setNominusConfig((prev) => ({
      ...prev,
      status: 'connected',
      lastSyncTime: new Date().toISOString(),
    }));
  };

  // Handler: Select Company
  const handleSelectCompany = (selected: CompanyConfig) => {
    setCompany(selected);
  };

  // Handler: Save or Add Company (supports quick registration by Name and RIF)
  const handleSaveCompany = (newOrUpdated: CompanyConfig) => {
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === newOrUpdated.id);
      if (exists) {
        return prev.map((c) => (c.id === newOrUpdated.id ? newOrUpdated : c));
      }
      return [newOrUpdated, ...prev];
    });
    setCompany(newOrUpdated);
    saveCompanyToCloud(newOrUpdated).catch(console.error);
  };

  // Handler: Delete Company
  const handleDeleteCompany = (idToDelete: string) => {
    setCompanies((prev) => {
      const filtered = prev.filter((c) => c.id !== idToDelete);
      if (company.id === idToDelete && filtered.length > 0) {
        setCompany(filtered[0]);
      }
      return filtered;
    });
    deleteCompanyFromCloud(idToDelete).catch(console.error);
  };

  // Handler: Add Receipt
  const handleAddReceipt = (newReceipt: BenefitReceipt) => {
    setReceipts((prev) => [newReceipt, ...prev]);
    saveReceiptToCloud(newReceipt).catch(console.error);
    if (firebaseUser) {
      archiveReceiptDocumentToCloud(newReceipt, company).catch(console.error);
    }
  };

  // Handler: Toggle Thumbprint
  const handleToggleThumbprint = (id: string) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextThumb = !r.hasWetThumbprint;
          const nextStatus: TriadStatus = nextThumb ? 'archivado' : r.triadStatus;
          const updated = {
            ...r,
            hasWetThumbprint: nextThumb,
            hasPhysicalSignature: nextThumb ? true : r.hasPhysicalSignature,
            triadStatus: nextStatus,
            dateArchivedPhysical: nextThumb ? new Date().toISOString().split('T')[0] : undefined,
          };
          // Also update selected receipt if currently open
          if (selectedReceipt && selectedReceipt.id === id) {
            setSelectedReceipt(updated);
          }
          saveReceiptToCloud(updated).catch(console.error);
          return updated;
        }
        return r;
      })
    );
  };

  // Handler: Update Status
  const handleUpdateReceiptStatus = (id: string, newStatus: TriadStatus) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = {
            ...r,
            triadStatus: newStatus,
            hasWetThumbprint: newStatus === 'archivado' ? true : r.hasWetThumbprint,
            hasPhysicalSignature: newStatus === 'archivado' ? true : r.hasPhysicalSignature,
            dateArchivedPhysical: newStatus === 'archivado' ? new Date().toISOString().split('T')[0] : undefined,
          };
          if (selectedReceipt && selectedReceipt.id === id) {
            setSelectedReceipt(updated);
          }
          saveReceiptToCloud(updated).catch(console.error);
          return updated;
        }
        return r;
      })
    );
  };

  // Handler: Update Receipt (e.g. modifying grocery items, amounts, etc.)
  const handleUpdateReceipt = (updated: BenefitReceipt) => {
    if (selectedReceipt && selectedReceipt.id === updated.id) {
      setSelectedReceipt(updated);
    }
    setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    saveReceiptToCloud(updated).catch(console.error);
  };

  // Handler: Preview Draft Receipt from FoodBasketModule
  const handlePreviewDraftReceipt = (draft: BenefitReceipt) => {
    setSelectedReceipt(draft);
    setIsPreviewModal(true);
  };

  // Handler: Confirm and emit draft from preview modal
  const handleConfirmEmitFromPreview = (draftReceipt: BenefitReceipt) => {
    const officialReceipt: BenefitReceipt = {
      ...draftReceipt,
      id: draftReceipt.id.startsWith('draft-') ? `rec-food-${Date.now()}` : draftReceipt.id,
    };
    handleAddReceipt(officialReceipt);
    setSelectedReceipt(officialReceipt);
    setIsPreviewModal(false);
  };

  // Handler: Add Employee
  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [...prev, newEmp]);
    saveEmployeeToCloud(newEmp).catch(console.error);
  };

  // Handler: Delete Employee
  const handleDeleteEmployee = (empId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
    deleteEmployeeFromCloud(empId).catch(console.error);
  };

  // Handler: Update Employee
  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    saveEmployeeToCloud(updatedEmp).catch(console.error);
  };

  // Handler: Update Multiple Employees
  const handleUpdateMultipleEmployees = (updatedList: Employee[]) => {
    setEmployees((prev) => {
      const map = new Map(updatedList.map((e) => [e.id, e]));
      return prev.map((e) => map.get(e.id) || e);
    });
    updatedList.forEach((emp) => saveEmployeeToCloud(emp).catch(console.error));
  };

  // Handler: Add Corporate Purchase Invoice
  const handleAddInvoice = (newInv: CorporateFoodPurchaseInvoice) => {
    setInvoices((prev) => [newInv, ...prev]);
    saveInvoiceToCloud(newInv).catch(console.error);
  };

  // Handler: Open Batch Print Modal
  const handleOpenBatchPrint = (receiptsToPrint: BenefitReceipt[]) => {
    setBatchPrintReceipts(receiptsToPrint);
  };

  // Handler: Mark batch as signed / archived with wet thumbprint
  const handleMarkBatchSigned = (ids: string[]) => {
    const idSet = new Set(ids);
    const today = new Date().toISOString().split('T')[0];
    setReceipts((prev) =>
      prev.map((r) => {
        if (idSet.has(r.id)) {
          const updated: BenefitReceipt = {
            ...r,
            hasWetThumbprint: true,
            hasPhysicalSignature: true,
            triadStatus: 'archivado',
            dateArchivedPhysical: today,
          };
          saveReceiptToCloud(updated).catch(console.error);
          return updated;
        }
        return r;
      })
    );
  };

  // Handler: Sync data from Nominus
  const handleSyncNominusData = (result: NominusSyncResult) => {
    // 0. Sync BCV Rate if returned by Nominus
    if (result.tasaBCV && result.tasaBCV > 0) {
      handleUpdateBCVRate(result.tasaBCV, result.fechaTasaBCV);
    }

    // 1. Merge or add companies from Nominus
    if (result.companies && result.companies.length > 0) {
      setCompanies((prev) => {
        const compMap = new Map<string, CompanyConfig>();
        prev.forEach((c) => compMap.set(c.rif.toUpperCase().trim(), c));
        result.companies.forEach((c) => {
          compMap.set(c.rif.toUpperCase().trim(), c);
          saveCompanyToCloud(c).catch(console.error);
        });
        return Array.from(compMap.values());
      });

      // Match or preserve active company
      const matched = result.companies.find(
        (c) => c.rif.toUpperCase().trim() === company.rif.toUpperCase().trim()
      );
      if (matched) {
        setCompany(matched);
      } else if (result.companies.length > 0) {
        setCompany(result.companies[0]);
      }
    }

    // 2. Merge or add employees from Nominus
    if (result.employees && result.employees.length > 0) {
      setEmployees((prev) => {
        const empMap = new Map<string, Employee>();
        prev.forEach((e) => empMap.set(`${e.companyId || ''}-${e.cedula.toUpperCase().trim()}`, e));

        result.employees.forEach((e) => {
          const key = `${e.companyId || ''}-${e.cedula.toUpperCase().trim()}`;
          const existing = empMap.get(key);
          if (existing) {
            const merged = {
              ...e,
              id: existing.id,
              adendaFirmada: existing.adendaFirmada || e.adendaFirmada,
              fechaFirmaAdenda: existing.fechaFirmaAdenda || e.fechaFirmaAdenda,
            };
            empMap.set(key, merged);
            saveEmployeeToCloud(merged).catch(console.error);
          } else {
            empMap.set(key, e);
            saveEmployeeToCloud(e).catch(console.error);
          }
        });

        return Array.from(empMap.values());
      });
    }

    // 3. Update connection status
    setNominusConfig((prev) => ({
      ...prev,
      status: 'connected',
      lastSyncTime: result.timestamp,
    }));
  };

  // Listen for iframe postMessage & URL parameters when embedded in Nominus
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isEmbed = params.get('nominus_embed') === '1' || params.get('embedded') === '1';
    const targetRif = params.get('company_rif');

    if (isEmbed) {
      setNominusConfig((prev) => ({ ...prev, isEmbedded: true }));
    }

    if (targetRif) {
      const found = companies.find(
        (c) => c.rif.replace(/[^A-Z0-9]/gi, '').toUpperCase() === targetRif.replace(/[^A-Z0-9]/gi, '').toUpperCase()
      );
      if (found) {
        setCompany(found);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'NOMINUS_INIT' || event.data.type === 'NOMINUS_SYNC') {
        if (event.data.company) {
          handleSaveCompany(event.data.company);
        }
        if (event.data.employees && Array.isArray(event.data.employees)) {
          handleSyncNominusData({
            success: true,
            companiesCount: event.data.company ? 1 : 0,
            employeesCount: event.data.employees.length,
            message: 'Sincronizado vía iframe desde Nóminus',
            timestamp: new Date().toISOString(),
            companies: event.data.company ? [event.data.company] : [],
            employees: event.data.employees,
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [companies, company.rif]);

  const pendingThumbprintsCount = receipts.filter((r) => !r.hasWetThumbprint).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        company={company}
        companies={companies}
        onSelectCompany={handleSelectCompany}
        onUpdateBCVRate={handleUpdateBCVRate}
        onSyncBCVFromNominus={handleSyncBCVFromNominus}
        pendingThumbprintsCount={pendingThumbprintsCount}
        nominusStatus={nominusConfig.status}
        firebaseConnected={Boolean(firebaseUser)}
        cloudFilesCount={cloudFiles.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            receipts={receipts}
            company={company}
            employees={employees}
            invoices={invoices}
            onNavigateTab={setCurrentTab}
            onSelectReceipt={setSelectedReceipt}
          />
        )}

        {currentTab === 'companies' && (
          <CompaniesManager
            companies={companies}
            activeCompany={company}
            employees={employees}
            onSelectCompany={handleSelectCompany}
            onSaveCompany={handleSaveCompany}
            onDeleteCompany={handleDeleteCompany}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'receipts' && (
          <ReceiptGenerator
            company={company}
            employees={employees}
            onAddReceipt={handleAddReceipt}
            onSelectReceipt={setSelectedReceipt}
            onBatchEmit={(newBatch) => {
              newBatch.forEach((r) => handleAddReceipt(r));
            }}
            onOpenBatchPrint={handleOpenBatchPrint}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'food-basket' && (
          <FoodBasketModule
            company={company}
            employees={employees}
            receipts={receipts}
            onAddReceipt={handleAddReceipt}
            onSelectReceipt={(receipt) => {
              setSelectedReceipt(receipt);
              setIsPreviewModal(false);
            }}
            onUpdateReceipt={handleUpdateReceipt}
            onPreviewDraftReceipt={handlePreviewDraftReceipt}
            onToggleThumbprint={handleToggleThumbprint}
            onNavigateTab={setCurrentTab}
            onOpenBatchPrint={handleOpenBatchPrint}
          />
        )}

        {currentTab === 'contracts' && (
          <ContractGenerator
            company={company}
            employees={employees}
            onUpdateEmployee={handleUpdateEmployee}
            onUpdateMultipleEmployees={handleUpdateMultipleEmployees}
          />
        )}

        {currentTab === 'vault' && (
          <TheVault
            receipts={receipts}
            company={company}
            employees={employees}
            onSelectReceipt={(receipt) => {
              setSelectedReceipt(receipt);
              setIsPreviewModal(false);
            }}
            onUpdateReceiptStatus={handleUpdateReceiptStatus}
            onToggleThumbprint={handleToggleThumbprint}
            onOpenBatchPrint={handleOpenBatchPrint}
            onMarkBatchSigned={handleMarkBatchSigned}
            onSaveReceiptToCloud={(r) => archiveReceiptDocumentToCloud(r, company)}
            onNavigateTab={setCurrentTab}
            cloudFilesCount={cloudFiles.length}
          />
        )}

        {currentTab === 'cloud' && (
          <CloudDatabasePanel
            user={firebaseUser}
            authReady={authReady}
            company={company}
            companies={companies}
            employees={employees}
            receipts={receipts}
            invoices={invoices}
            cloudFiles={cloudFiles}
          />
        )}

        {currentTab === 'seniat' && (
          <SeniatAudit
            company={company}
            receipts={receipts}
            invoices={invoices}
            employees={employees}
            onAddInvoice={handleAddInvoice}
          />
        )}

        {currentTab === 'employees' && (
          <EmployeesManager
            employees={employees}
            company={company}
            companies={companies}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'nominus' && (
          <NominusConnector
            nominusConfig={nominusConfig}
            onSaveConfig={setNominusConfig}
            onSyncData={handleSyncNominusData}
            company={company}
            companies={companies}
            employees={employees}
            receipts={receipts}
            onNavigateTab={setCurrentTab}
            onSelectCompany={handleSelectCompany}
          />
        )}
      </main>

      {/* Modal for previewing, printing, and downloading receipts */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          company={company}
          onClose={() => {
            setSelectedReceipt(null);
            setIsPreviewModal(false);
          }}
          onToggleStatus={handleUpdateReceiptStatus}
          onToggleThumbprint={handleToggleThumbprint}
          onUpdateReceipt={handleUpdateReceipt}
          isPreview={isPreviewModal}
          onConfirmEmit={handleConfirmEmitFromPreview}
        />
      )}

      {/* Modal for batch printing and downloading multi-page PDF */}
      {batchPrintReceipts && (
        <BatchPrintModal
          receipts={batchPrintReceipts}
          company={company}
          onClose={() => setBatchPrintReceipts(null)}
          onMarkBatchSigned={handleMarkBatchSigned}
        />
      )}

      {/* Footer - No print */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            {company.razonSocial} • R.I.F. {company.rif}
          </span>
          <span>
            Amparado en el Art. 105 LOTTT • Sentencia N° 523 TSJ (Caso INDULAC) • Deducibilidad ISLR Art. 27 LISLR
          </span>
          <span className="font-mono text-[11px]">
            Tasa Oficial BCV: Bs. {company.tasaBCV.toFixed(2)}
          </span>
        </div>
      </footer>
    </div>
  );
}
