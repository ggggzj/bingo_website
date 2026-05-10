import { SiGithub } from "react-icons/si";
import { CheckCircle2, Search, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { WaitlistForm } from "@/components/WaitlistForm";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background selection:bg-primary/20 selection:text-primary overflow-x-hidden flex flex-col">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 max-w-7xl mx-auto w-full">
        {/* Background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8">
            <ShieldCheck className="w-4 h-4" />
            <span>Built for International Tech Students</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            Tech Job Search Platform for <span className="text-primary">International Students</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Navigate the tech job market with confidence. We verify H1B visa sponsorship history instantly so you never waste time applying to companies that won't sponsor.
          </p>
        </div>
      </section>

      {/* Extension Feature Section */}
      <section className="py-24 bg-white border-y border-border px-6 relative overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 space-y-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  The H1B Checker Extension
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Instantly verify H1B sponsorship history while browsing job listings. Powered by official USCIS data, updated in real-time. See which companies actually sponsor visas—no more guessing, no more wasted applications. Check sponsorship stats, approval rates, and historical data with one click as you browse LinkedIn, Indeed, or any job board.
                </p>
              </div>

              <ul className="space-y-4">
                {[
                  "Official DOL data",
                  "Real-time updates",
                  "One-click verification",
                  "Historical approval rates"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <a 
                  href="https://github.com/ggggzj/H1B_Checker" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 h-14 px-8 rounded-xl bg-[#24292f] hover:bg-[#24292f]/90 text-white font-semibold text-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24292f] focus-visible:ring-offset-2"
                  data-testid="link-download-extension"
                >
                  <SiGithub className="w-6 h-6" />
                  Download Extension
                </a>
                <p className="mt-3 text-sm text-muted-foreground">Free and open source on GitHub</p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
                <div className="h-10 border-b border-border bg-muted/50 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="ml-4 h-6 bg-white border border-border rounded-md flex-1 max-w-sm flex items-center px-2 text-xs text-muted-foreground gap-2 shadow-sm">
                    <Search className="w-3 h-3" />
                    linkedin.com/jobs/view/software-engineer
                  </div>
                </div>
                
                <div className="flex-1 p-6 relative bg-gray-50 flex items-start justify-center">
                   {/* Mockup of job posting */}
                   <div className="w-full max-w-md bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
                     <div className="w-12 h-12 rounded-lg bg-blue-600 mb-4" />
                     <div className="h-6 w-3/4 bg-gray-200 rounded" />
                     <div className="h-4 w-1/2 bg-gray-100 rounded" />
                     <div className="pt-4 border-t border-gray-100 flex gap-2">
                       <div className="h-8 w-24 bg-gray-100 rounded-md" />
                       <div className="h-8 w-24 bg-gray-100 rounded-md" />
                     </div>
                   </div>

                   {/* Mockup of extension overlay */}
                   <div className="absolute top-8 right-6 w-72 bg-white rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700 delay-300 fill-mode-both">
                     <div className="p-4 border-b border-border bg-primary/5 flex items-start gap-3">
                       <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                         H1B
                       </div>
                       <div>
                         <h4 className="font-semibold text-sm">TechCorp Inc.</h4>
                         <p className="text-xs text-muted-foreground flex items-center gap-1">
                           <MapPin className="w-3 h-3" /> San Francisco, CA
                         </p>
                       </div>
                     </div>
                     <div className="p-4 space-y-4">
                       <div>
                         <div className="flex justify-between text-sm mb-1">
                           <span className="text-muted-foreground">Sponsorship Rate</span>
                           <span className="font-medium text-green-600">High (92%)</span>
                         </div>
                         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                           <div className="h-full bg-green-500 w-[92%]" />
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2 text-center">
                         <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                           <div className="text-xl font-bold text-foreground">428</div>
                           <div className="text-[10px] text-muted-foreground uppercase tracking-wider">LCAs Filed</div>
                         </div>
                         <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                           <div className="text-xl font-bold text-foreground">$145k</div>
                           <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Salary</div>
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-24 px-6 max-w-5xl mx-auto w-full text-center">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-semibold uppercase tracking-wider">
          Roadmap
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          More features in development
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          The Chrome extension is just the beginning. We're building a comprehensive platform to track companies, manage applications, and connect with other international students.
        </p>
        
        <div className="grid sm:grid-cols-3 gap-6 mt-12 text-left">
          {[
            { title: "Company Database", desc: "Searchable directory of all H1B sponsoring companies with deep analytics." },
            { title: "Application Tracker", desc: "Keep track of where you've applied, interview stages, and sponsorship requirements." },
            { title: "Community Insights", desc: "Learn from the interview experiences of other international students." }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-muted/30 border border-border/50">
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="py-24 px-6 bg-primary/5 border-t border-primary/10 mt-auto">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Join the Waitlist
          </h2>
          <p className="text-muted-foreground mb-8">
            Be the first to know when we launch new features to supercharge your job search.
          </p>
          <div className="max-w-md mx-auto text-left">
            <WaitlistForm />
          </div>
        </div>
      </section>

    </div>
  );
}
