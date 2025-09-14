interface StepProps {
	number: string;
	title: string;
	description: string;
}

const Step = ({ number, title, description }: StepProps) => {
	return (
		<div className='flex flex-col items-center text-center'>
			<div className='bg-indigo-200 rounded-full w-16 h-16 flex items-center justify-center mb-6'>
				<span className='text-xl font-medium text-indigo-800'>{number}</span>
			</div>
			<h3 className='text-xl font-semibold text-white mb-3'>{title}</h3>
			<p className='text-gray-300 max-w-xs'>{description}</p>
		</div>
	);
};

export default function HowItWorks() {
	const steps: StepProps[] = [
		{
			number: "01",
			title: "Create your Account",
			description:
				"Sign up and create your profile as a project founder or talent provider",
		},
		{
			number: "02",
			title: "Connect & Collaborate",
			description:
				"Find the perfect match for your Project or skill and start collaborating",
		},
		{
			number: "03",
			title: "Launch Project",
			description:
				"Launch your project to the world and continue growing with our platform.",
		},
	];

	return (
		<div className='py-20 bg-custom-dark-blue'>
			<div className='container mx-auto px-4'>
				<div className='text-center mb-16'>
					<h2 className='text-4xl font-bold text-indigo-300 mb-4'>
						How it works
					</h2>
					<p className='text-gray-300 max-w-2xl mx-auto'>
						Our platform connects Web3 projects with talent and resources in a
						seamless, efficient process.
					</p>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-3 gap-12'>
					{steps.map((step, index) => (
						<Step
							key={index}
							number={step.number}
							title={step.title}
							description={step.description}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
